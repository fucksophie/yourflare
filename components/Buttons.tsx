import { ComponentChildren, JSX } from "preact";
import { buttonClass } from "../routes/index.tsx";

interface ButtonsAttributes extends JSX.HTMLAttributes {
  rotation?: "hort"|"vert";
}

const vert = "flex flex-col w-max gap-1"
const hort = ""

function iterator(children: ComponentChildren) {
  // @ts-ignore-start: TODO: Fix this!!
  // deno-lint-ignore no-explicit-any
  return ([...children] as any[]).map((y,i) => {
    // @ts-ignore-end
    y.props.class = buttonClass+" "+y.props.class;
    return y;
  })
} 

function hortify(children: ComponentChildren) {
  // @ts-ignore-start: TODO: Fix this!!
  // deno-lint-ignore no-explicit-any
  return ([...children] as any[]).map((y,i) => {
  // @ts-ignore-end
    y.props.class+= " mr-2";
    return y;
  })
}

export function Buttons(props: ButtonsAttributes) {
  let cc = "";
  let children = props.children;
  if(!props.rotation || props.rotation == "vert") cc = vert;
  if(props.rotation == "hort") {
    cc = hort;
    children = hortify(children);
  }
  children = iterator(children);
  return (
    <>
      <div class={cc+" my-2"}>
        {children}
      </div>
      <div class={buttonClass +" hidden mx-2 mr-2"}>This element is tailwind preload!</div> 
    </>
  );
}
