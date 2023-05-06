import Toastify from 'https://esm.sh/toastify-js@1.12.0'
import { ToastDefault } from "../islands/Login.tsx";

export const buttonClass =
  "px-1 bg-slate-300 rounded border-[1.5px] border-solid border-sky-500 hover:border-sky-700 transition-all";

export function Hr() {
  return (
    <hr class="w-48 h-1 my-1 bg-gray-200 border-2 rounded"></hr>
  );
}

export async function request(url: string, text: string, action: ()=>void = () => {setTimeout(()=>{location.reload()}, 1000)}, showToast = true) {
  const request = await fetch(url)
  const json = await request.json();

  if(request.ok) {
    if(showToast) {
      Toastify({
        ...ToastDefault,
        text
      }).showToast();
    }
    action();
  } else {
    Toastify({
      ...ToastDefault,
      text: json.error,
    }).showToast();
  }
}