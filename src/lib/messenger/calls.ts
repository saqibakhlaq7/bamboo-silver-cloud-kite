import { defaultIceServers } from "@/lib/multiplayer";

export type CallRole = "incoming" | "outgoing";

export type ActiveCall = {
  id: string;
  peerId: string;
  conversationId: string;
  video: boolean;
  role: CallRole;
  status: "ringing" | "connecting" | "live";
  muted: boolean;
  cameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

export type SignalOut = {
  action: "invite" | "accept" | "reject" | "hangup" | "offer" | "answer" | "ice";
  callId: string;
  video: boolean;
  sdp?: string;
  ice?: string;
};

export class CallEngine {
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private remoteSet = false;
  private send: (sig: SignalOut) => void;
  private onChange: (stream: MediaStream | null) => void;
  call: ActiveCall;

  constructor(
    call: ActiveCall,
    send: (sig: SignalOut) => void,
    onChange: (stream: MediaStream | null) => void,
  ) {
    this.call = call;
    this.send = send;
    this.onChange = onChange;
  }

  async startMedia(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: this.call.video ? { facingMode: "user", width: { ideal: 960 } } : false,
    });
    this.local = stream;
    this.call.localStream = stream;
    if (this.pc) {
      stream.getTracks().forEach((t) => {
        const already = this.pc?.getSenders().some((s) => s.track?.id === t.id);
        if (!already) this.pc?.addTrack(t, stream);
      });
    }
    return stream;
  }

  private ensurePc(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
    this.pc = pc;
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      this.send({
        action: "ice",
        callId: this.call.id,
        video: this.call.video,
        ice: JSON.stringify(e.candidate.toJSON()),
      });
    };
    pc.ontrack = (e) => {
      let stream = this.call.remoteStream;
      if (!stream) {
        stream = e.streams[0] ? new MediaStream(e.streams[0].getTracks()) : new MediaStream();
        this.call.remoteStream = stream;
      }
      if (!stream.getTracks().some((t) => t.id === e.track.id)) {
        stream.addTrack(e.track);
      }
      stream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      this.call.status = "live";
      this.onChange(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.call.status = "live";
        this.onChange(this.call.remoteStream);
      }
    };
    if (this.local) {
      this.local.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    } else {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      if (this.call.video) pc.addTransceiver("video", { direction: "sendrecv" });
    }
    return pc;
  }

  async makeOffer(): Promise<void> {
    const pc = this.ensurePc();
    this.call.status = "connecting";
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: this.call.video });
    await pc.setLocalDescription(offer);
    this.send({
      action: "offer",
      callId: this.call.id,
      video: this.call.video,
      sdp: offer.sdp ?? "",
    });
  }

  async takeOffer(sdp: string): Promise<void> {
    const pc = this.ensurePc();
    await pc.setRemoteDescription({ type: "offer", sdp });
    this.remoteSet = true;
    await this.flushIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.call.status = "connecting";
    this.send({
      action: "answer",
      callId: this.call.id,
      video: this.call.video,
      sdp: answer.sdp ?? "",
    });
  }

  async takeAnswer(sdp: string): Promise<void> {
    const pc = this.ensurePc();
    await pc.setRemoteDescription({ type: "answer", sdp });
    this.remoteSet = true;
    await this.flushIce();
    this.call.status = "live";
  }

  async takeIce(raw: string): Promise<void> {
    let init: RTCIceCandidateInit;
    try {
      init = JSON.parse(raw) as RTCIceCandidateInit;
    } catch {
      return;
    }
    if (!this.remoteSet || !this.pc) {
      this.pendingIce.push(init);
      return;
    }
    try {
      await this.pc.addIceCandidate(init);
    } catch {
      /* glare */
    }
  }

  private async flushIce(): Promise<void> {
    if (!this.pc) return;
    const pending = this.pendingIce.splice(0);
    for (const c of pending) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {
        /* ignore */
      }
    }
  }

  setMuted(muted: boolean): void {
    this.call.muted = muted;
    this.local?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setCameraOff(off: boolean): void {
    this.call.cameraOff = off;
    this.local?.getVideoTracks().forEach((t) => {
      t.enabled = !off;
    });
  }

  close(): void {
    this.local?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.local = null;
    this.call.localStream = null;
    this.call.remoteStream = null;
    this.onChange(null);
  }
}

export function startRing(): () => void {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return () => {};
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 520;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  const pulse = window.setInterval(() => {
    gain.gain.setTargetAtTime(gain.gain.value > 0.02 ? 0.004 : 0.045, ctx.currentTime, 0.05);
  }, 420);
  return () => {
    window.clearInterval(pulse);
    try {
      osc.stop();
      void ctx.close();
    } catch {
      /* already closed */
    }
  };
}
