import { asset } from "$fresh/runtime.ts";
import { JSX } from "preact";
import { Buttons } from "./Buttons.tsx";
import { User } from "../src/database.ts";

interface AppAttributes extends JSX.HTMLAttributes {
  user?: User;
}

export function App(props: AppAttributes) {
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
        <div class="w-full h-10 bg-slate-200 flex p-2 items-center gap-2">
          <div>
            yourflare
            <Buttons rotation="hort" divClass="inline ml-2">
              {
                (() => {
                  if(props.user) {
                    return [
                      <a href="/dash">dashboard</a>,
                      <a href="/domains">domains</a>
                    ];
                  } 
                })()
              }

              {
                (() => {
                  if(props?.user?.admin) {
                    return <a href="/admin">admin</a>;
                  }
                })()
              }

              {
                (() => {
                  if(!props.user) {
                    return [
                      <a href="/login">login</a>,
                      <a href="/register">register</a>
                    ];
                  } 
                })()
              }
            </Buttons>
          </div>

          <div class="ml-auto">
            {
              (() => {
                if(props?.user) {
                  return <h1>logged in as {props.user?.username}</h1>;
                }
              })()
            }
          </div>
        </div>
        <div class="ml-2 mt-2">
          {props.children}
        </div>
      </body>
    </>
  );
}
