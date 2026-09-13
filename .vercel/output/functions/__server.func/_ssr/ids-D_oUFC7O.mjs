//#region node_modules/.nitro/vite/services/ssr/assets/ids-D_oUFC7O.js
function dmId(a, b) {
	return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}
function notesId(userId) {
	return `notes:${userId}`;
}
function isNotesId(id) {
	return id.startsWith("notes:");
}
function previewText(body, mediaKind) {
	if (mediaKind === "image") return body.trim() ? body : "Photo";
	if (mediaKind === "voice") return "Voice note";
	if (mediaKind === "file") return body.trim() ? body : "File";
	return body.trim() || "Message";
}
//#endregion
export { previewText as i, isNotesId as n, notesId as r, dmId as t };
