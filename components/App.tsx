import { asset } from "$fresh/runtime.ts";
import { JSX } from "preact";

export function App(props: JSX.HTMLAttributes) {
  return (
    <>
      <head>
        <title>yourflare</title>
        <link rel="stylesheet" href={asset("toastify.css")} />
      </head>
      <body>
        <div class="ml-2 mt-2">
          {props.children}
        </div>
      </body>
    </>
  );
}
