import { JSX, VNode } from "preact";
import { buttonClass } from "../src/misc.tsx";

interface ButtonsAttributes extends JSX.HTMLAttributes {
  rotation?: "hort"|"vert";
  divClass?: string;
}

const vert = "flex flex-col w-max gap-1"
const hort = ""

function iterator(children: VNode<JSX.HTMLAttributes>[]) {
  return children.map((y,i) => {

    y.props.class = buttonClass+" "+y.props.class;
    return y;
  })
} 

function hortify(children: VNode<JSX.HTMLAttributes>[]) {
  return children.map((y,i) => {
    y.props.class+= " mr-2";
    return y;
  })
}

export function Buttons(props: ButtonsAttributes) {
  let cc = "";
  let children = (props.children as VNode[]).filter(Boolean).flat();
  if(!props.rotation || props.rotation == "vert") cc = vert;
  if(props.rotation == "hort") {
    cc = hort;
    children = hortify(children);
  }
  children = iterator(children);
  return (
    <>
      <div class={cc+" my-2 " + props.divClass}>
        {children}
      </div>
      <div class={buttonClass +" hidden mx-2 mr-2"}>This element is tailwind preload!</div> 
    </>
  );
}
