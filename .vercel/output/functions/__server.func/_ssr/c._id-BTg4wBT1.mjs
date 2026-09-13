import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as Route$1 } from "./router-bAnbkjeo.mjs";
import { t as MessengerGate } from "./gate-CMInHccP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/c._id-BTg4wBT1.js
var import_jsx_runtime = require_jsx_runtime();
function ChatRoute() {
	const { id } = Route$1.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessengerGate, { selectedId: decodeURIComponent(id) });
}
//#endregion
export { ChatRoute as component };
