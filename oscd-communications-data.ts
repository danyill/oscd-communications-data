import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { msg, str } from '@lit/localize';

// import { configureLocalization, localized, msg, str } from '@lit/localize';
// import { get, translate } from 'lit-translate';

import '@material/mwc-list/mwc-check-list-item';
import '@material/dialog';
import '@material/mwc-button';
import type { Dialog } from '@material/mwc-dialog';

import type { OscdFilteredList } from './foundation/components/oscd-filtered-list.js';

import './foundation/components/oscd-textfield.js';

function getConnectedItems(doc: Element, nodePathName): Array {
  console.log('hey');
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
    // .getAttribute('pathName')
    // console.log(busNodes)
    // this.dialog.show();
    // XAT/V220/Bus_A/L1
    // ConductingEquipment => get matching Node
    // get Other Node
    // Keep going until hit type=CTR
  }

  getBuses(): Map<string, Element> {
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

  getBusConnectedElements(busName: string): void {
    const busNodePathName = this.getBuses()
      .get(busName)
      ?.getAttribute('pathName');
    return getConnectedItems(this.doc.documentElement, busNodePathName);
  }

  async docUpdate(): Promise<void> {
    await ((this.getRootNode() as ShadowRoot).host as LitElement)
      .updateComplete;
  }

  protected firstUpdated(): void {
    this.parentElement?.setAttribute('style', 'opacity: 1');
  }

  render(): TemplateResult {
    return html`<mwc-dialog heading="${msg('Import Template IEDs')}">
      <oscd-filtered-list multi> </oscd-filtered-list>
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
        @click="${() => console.log('hi')}"
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
