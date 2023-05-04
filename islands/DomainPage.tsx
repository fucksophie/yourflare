// deno-lint-ignore-file no-explicit-any
import { Attributes, Component, ComponentChild, JSX, render } from "preact";
import { buttonClass, Hr } from "../routes/index.tsx";
import Toastify from 'https://esm.sh/toastify-js@1.12.0'
import { ToastDefault } from "./Login.tsx";
import { DNSRecord, allowedRecords, recordDefinitions, supportedRecords } from "../src/domains.ts";
import { Domain } from "../src/database.ts";

function shallowEqual(a: any[], b: any[]) {
  return a.every(item => b.includes(item)) && b.every(item => a.includes(item))
}

export function Td(props: JSX.HTMLAttributes<HTMLTableCellElement>) {
  return <td class="pl-2">{props.children}</td>;
}

export function Th(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  return <th class="pl-2">{props.children}</th>;
}

export function Tr(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const elem = <tr class="hover:bg-slate-200 rounded max-h-min overflow-scroll px-1">{props.children}</tr>;
  Object.entries(props).forEach((v) => {
    if(v[0] == "children") return;
    elem.props[v[0]] = v[1];
  })
  return elem;
}

interface DomainAttributes extends Attributes {
  domain: Domain;
  admin?: boolean;
}

export default class DomainPage extends Component {
  props: DomainAttributes;
  
  constructor(props: DomainAttributes) {
    super(props);
    this.props = props;
  }

  async changeTtl() {
    const input = +(document.getElementById("ttl") as HTMLInputElement).value;
    const request = await fetch("/api/ttl?id="+this.props.domain.id+"&ttl="+input);
    const json = await request.json();
    
    if(!request.ok) {
      Toastify({
        ...ToastDefault,
        text: "TTL: " + json.error,
      }).showToast();
    }
  }

  async addRecord() {
    const typeElement = document.getElementById("type") as HTMLSelectElement;
    const fieldElements = Array.from(document.querySelectorAll(".field")) as HTMLInputElement[];
    const type = typeElement.selectedOptions[0].getAttribute("name");
    const fields = fieldElements.map(z => z.value);
    if(!type || fields.find(z => !z)) return;
    
    const previousRecords = JSON.parse(JSON.stringify(this.props.domain.records));

    if(!this.props.domain.records[type]) this.props.domain.records[type] = [];
    const record = new DNSRecord(type as allowedRecords);
    record.setFields(fields)
    this.props.domain.records[type].push(record)
    await this.updateRecords(previousRecords);
  } 

  async updateRecords(previousRecords: Record<string, DNSRecord[]>) {
    const request = await fetch("/api/records", {
      method: "POST",
      headers: {
        "Content-Type": "appliction/json"
      },
      body: JSON.stringify({
        records: this.props.domain.records,
        id: this.props.domain.id
      })
    })

    const json = await request.json();

    if(request.ok) {
      Toastify({
        ...ToastDefault,
        text: "Records modified!"
      }).showToast();
    } else {
      Toastify({
        ...ToastDefault,
        text: json.error,
      }).showToast();
      this.props.domain.records = previousRecords;
    }

    const records = document.getElementById("records")!;
    records.innerHTML = "";
    render(this.renderRecords(), records);
  }

  async removeRecord(type: string, a: HTMLTableCellElement) {
    const element = a.parentElement as HTMLTableRowElement;
    const children = Array.from(element.children);
    
    const fields = children.map(z => z.textContent);
    const previousRecords = JSON.parse(JSON.stringify(this.props.domain.records));
    if(!type) return;
    this.props.domain.records[type] = this.props.domain.records[type].filter(z => {
      return !shallowEqual(z.fields, fields);
    })

    await this.updateRecords(previousRecords);
  }
  
  static renderFields() {
    if(typeof document == "undefined") return;
    const typeElement = document.getElementById("type") as HTMLSelectElement;
    const type = typeElement.selectedOptions[0].getAttribute("name")!;
    return recordDefinitions[type].map(z => {
      return <input placeholder={z} class={"w-["+z.length*14+"px] pl-2 field"}></input>
    })
  }
  
  deleteDomain() {
    const toast = Toastify({
      ...ToastDefault,
      text: "Are you sure that you want to delete this domain? (click!)",
      onClick: async () => {
        toast.hideToast();
        const request = await fetch("/api/deletedomain?id="+this.props.domain.id)
        const json = await request.json();

        if(request.ok) {
          Toastify({
            ...ToastDefault,
            text: "Domain deleted."
          }).showToast();

          setTimeout(()=>{
            location.href = "/dash"
          }, 1000)
        } else {
          Toastify({
            ...ToastDefault,
            text: json.error,
          }).showToast();
        }
      }
    });
    toast.showToast();
  }

  renderRecords() {
    const components: Record<string, JSX.Element[]> = {};
    
    Object.entries(this.props.domain.records).forEach(v => {
      if(!components[v[0]]) components[v[0]] = [];
      components[v[0]].push(<>
      <tr>
        <Th>[{v[0]}]</Th>
        {recordDefinitions[v[0]].map(z=> {
          return <Th>{z.toLowerCase()}</Th>
        })}
      </tr>
        {
          v[1].map(y => {
            return <Tr onClick={async (g) => await this.removeRecord(v[0], g.target as HTMLTableCellElement)}>{y.fields.map((b,i) => {if(i==0)return<td>{b}</td>;else return <Td>{b}</Td>})}</Tr>
          })
        }
      </>);
    })

    return (<>
      {
        Object.values(components)
      }
    </>)
  }

  static renderFieldSelection() {
    return <div class="my-2">
      <select id="type" onChange={() => {
        const fields = document.getElementById("fields")!;
        fields.innerHTML = "";
        render(DomainPage.renderFields(), fields);
      }}>
        {supportedRecords.map(z => {
          return <option name={z}>{z.toUpperCase()}</option>
        })}
      </select>
      <span id="fields">
        {DomainPage.renderFields()}
      </span>
    </div>;
  }


  render(): ComponentChild {
    return (
      <>
        <h1 class="text-2xl pb-2">{this.props.domain.zone}</h1>
        
        {(() => {
          if(this.props.admin) return <h1 class="text-xl">This domain is not yours. (Admin status!)</h1>;
          else
            return <></>
        })()}

        <div>
          TTL: <input type="number" onInput={async () => await this.changeTtl()} id="ttl" value={this.props.domain.ttl}></input>
        </div>
        <Hr></Hr>
        <button class={buttonClass} onClick={async () => await this.deleteDomain()}>Delete domain</button>

        <div>Create new record</div>

        {DomainPage.renderFieldSelection()}
        <button class={buttonClass} onClick={async () => await this.addRecord()}>Add record</button>

        <Hr></Hr>

        <div>Current records</div>
        <table class="flex flex-col" id="records">
          {this.renderRecords()}
        </table>
      </>
    );
  }
}
/*
          <input placeholder="Name" class="w-20 pl-2 field"></input>
          <input placeholder="Ipv4" class="w-20 pl-2 field"></input>*/
