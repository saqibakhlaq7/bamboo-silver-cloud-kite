import { useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { useMessenger } from "@/lib/messenger/context";

function VideoTag({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export function CallOverlay() {
  const { call, people, now, acceptCall, rejectCall, hangup, toggleMute, toggleCamera } = useMessenger();
  if (!call) return null;
  const peer = people[call.peerId];
  const name = peer?.displayName || "Call";
  const ringing = call.status === "ringing";
  const incoming = call.role === "incoming" && ringing;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg text-fg">
      {call.video && call.remoteStream ? (
        <VideoTag stream={call.remoteStream} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-surface" />
      )}
      <div className="absolute inset-0 bg-bg/40" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <PersonAvatar
          name={name}
          photo={peer?.photoData}
          lastSeen={peer?.lastSeen}
          now={now}
          size="lg"
          showOnline
        />
        <div>
          <p className="font-display text-3xl font-medium tracking-tight">{name}</p>
          <p className="mt-1 text-sm text-muted">
            {incoming
              ? call.video
                ? "Incoming video call"
                : "Incoming voice call"
              : call.status === "live"
                ? call.video
                  ? "Video"
                  : "Voice"
                : call.status === "connecting"
                  ? "Connecting…"
                  : "Calling…"}
          </p>
        </div>
      </div>

      {call.video && call.localStream ? (
        <VideoTag
          stream={call.localStream}
          muted
          className="absolute bottom-28 right-4 z-10 h-36 w-28 rounded-lg border border-border object-cover shadow-panel"
        />
      ) : null}

      <div className="relative z-10 flex items-center justify-center gap-3 px-6 pb-10">
        {incoming ? (
          <>
            <Button size="lg" variant="danger" onClick={rejectCall} className="rounded-full px-6">
              <PhoneOff className="size-4" />
              Decline
            </Button>
            <Button size="lg" onClick={() => void acceptCall()} className="rounded-full px-6">
              {call.video ? <Video className="size-4" /> : <Phone className="size-4" />}
              Accept
            </Button>
          </>
        ) : (
          <>
            <Button
              size="icon"
              variant={call.muted ? "danger" : "secondary"}
              className="rounded-full"
              onClick={toggleMute}
              aria-label={call.muted ? "Unmute" : "Mute"}
            >
              {call.muted ? <MicOff /> : <Mic />}
            </Button>
            {call.video ? (
              <Button
                size="icon"
                variant={call.cameraOff ? "danger" : "secondary"}
                className="rounded-full"
                onClick={toggleCamera}
                aria-label={call.cameraOff ? "Camera on" : "Camera off"}
              >
                {call.cameraOff ? <VideoOff /> : <Video />}
              </Button>
            ) : null}
            <Button size="lg" variant="danger" className="rounded-full px-6" onClick={hangup}>
              <PhoneOff className="size-4" />
              End
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
