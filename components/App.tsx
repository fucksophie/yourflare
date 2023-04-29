import { asset } from "$fresh/runtime.ts";
import { JSX } from "preact";

export function App(props: JSX.HTMLAttributes) {
  return (
    <>
      <head>
        <title>yourflare</title>
        <meta name="title" content="yourflare"></meta>
        <meta name="description" content="Opensource DNS managment."></meta>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        <meta property="og:type" content="website"></meta>
        <meta property="og:title" content="yourflare"></meta>
        <meta property="og:description" content="Opensource DNS managment."></meta>

        <meta property="twitter:card" content="summary_large_image"></meta>
        <meta property="twitter:title" content="yourflare"></meta>
        <meta property="twitter:description" content="Opensource DNS managment."></meta>

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
