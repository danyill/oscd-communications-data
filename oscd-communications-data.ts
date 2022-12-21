import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { msg, str } from '@lit/localize';

// import { configureLocalization, localized, msg, str } from '@lit/localize';
// import { get, translate } from 'lit-translate';

import '@material/mwc-list/mwc-radio-list-item';
import '@material/dialog';
import '@material/mwc-button';
import type { Dialog } from '@material/mwc-dialog';

import type { RadioListItem } from '@material/mwc-list/mwc-radio-list-item';
import type { OscdFilteredList } from './foundation/components/oscd-filtered-list.js';

import './foundation/components/oscd-textfield.js';

function getConnectedIeds(doc: Element, nodePathName: string): Array<string> {
  const connectedBays = Array.from(
    doc.querySelectorAll(':root > Substation > VoltageLevel > Bay')!
  ).filter(bay =>
    Array.from(bay.querySelectorAll('Terminal')).some(terminal =>
      terminal.getAttribute('connectivityNode')?.includes(nodePathName)
    )
  );

  const lNodes: Element[] = [];

  connectedBays.forEach(bay => {
    bay.querySelectorAll('LNode').forEach(lNode => {
      const iedName = lNode.getAttribute('iedName');
      if (iedName) lNodes.push(lNode);
    });
  });


  // get "promoted bays" for transformers
  // fetch devices from terminals connected to the 
  // get PowerTransformer elements.
  // get their bays and their terminals
  // if the PowerTransformer lower voltage is <= 50 kV
  // promote the bay.
  // Otherwise it belongs to the other bus and we'll do inter-bay GOOSE/SMV
  // connectedBays
  // getTransformerBays



  //  make unique
  return lNodes
    .map(lN => lN.getAttribute('iedName')!)
    .filter((v, i, a) => a.indexOf(v) === i);
}

export default class CommunicationsDataPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @query('#CommunicationsDataPlugin-plugin-input')
  pluginFileUI!: HTMLInputElement;

  @query('mwc-dialog') dialog!: Dialog;

  @query('oscd-filtered-list') filteredList!: OscdFilteredList;

  async run(): Promise<void> {
    const busesSCL = Array.from(
      this.doc.querySelectorAll(':root > Substation > VoltageLevel > Bay')
    ).filter(bay => bay.getAttribute('name')?.toUpperCase().startsWith('BUS'));
    const busNodes = new Map();
    busesSCL.forEach((bus: Element) =>
      busNodes.set(
        bus.getAttribute('name')!,
        bus.querySelector('ConnectivityNode')!
      )
    );

    this.dialog.show();
    // .getAttribute('pathName')
    // console.log(busNodes)

    // XAT/V220/Bus_A/L1
    // ConductingEquipment => get matching Node
    // get Other Node
    // Keep going until hit type=CTR
  }

  getBuses(): Map<string, Element> | null {
    if (!this.doc) return null;
    const busesSCL = Array.from(
      this.doc.querySelectorAll(':root > Substation > VoltageLevel > Bay')
    ).filter(bay => bay.getAttribute('name')?.toUpperCase().startsWith('BUS'));
    const busNodes = new Map();
    busesSCL.forEach((bus: Element) =>
      busNodes.set(
        bus.getAttribute('name')!,
        bus.querySelector('ConnectivityNode')!
      )
    );
    return busNodes;
  }

  getBusConnectedElements(busName: string): Array<string> {
    const buses = this.getBuses();
    if (buses === null) return [];
    const busNodePathName =
      buses.get(busName)?.getAttribute('pathName') ?? 'unknown';

    console.log(getConnectedIeds(this.doc.documentElement, busNodePathName));
    return getConnectedIeds(this.doc.documentElement, busNodePathName);
  }

  async docUpdate(): Promise<void> {
    await ((this.getRootNode() as ShadowRoot).host as LitElement)
      .updateComplete;
  }

  protected firstUpdated(): void {
    this.parentElement?.setAttribute('style', 'opacity: 1');
  }

  getItems(): TemplateResult {
    const buses = this.getBuses();
    if (buses !== null) {
      return html`${Array.from(buses.keys()).map(
        bus => html`<mwc-radio-list-item twoline value="${bus}"
          >${bus}</mwc-radio-list-item
        >`
      )}`;
    }
    return html`${nothing}`;
  }

  render(): TemplateResult {
    return html`<mwc-dialog heading="${msg('Communication Data')}">
      <oscd-filtered-list>${this.getItems()}</oscd-filtered-list>
      <mwc-button
        class="close-button"
        dialogAction="close"
        label="${msg('close')}"
        slot="secondaryAction"
      ></mwc-button>
      <mwc-button
        label="IEDs (nah)"
        slot="primaryAction"
        icon="add"
        @click="${() =>
          this.getBusConnectedElements(
            (<RadioListItem>(
              this.filteredList.querySelector('mwc-radio-list-item[selected]')!
            )).value
          )}"
        ?disabled=${false}
      ></mwc-button>
    </mwc-dialog>`;
  }

  static styles = css`
    .close-button {
      --mdc-theme-primary: var(--mdc-theme-error);
    }

    mwc-list-item.hidden {
      display: none;
    }
  `;
}
