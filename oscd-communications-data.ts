import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { msg, str } from '@lit/localize';

import { Graph, NodeIdentifier } from '@api-modeling/graphlib';

// added to src/alg/index.js
// export { default as dfs } from './dfs.js';

// import { configureLocalization, localized, msg, str } from '@lit/localize';
// import { get, translate } from 'lit-translate';

import '@material/mwc-list/mwc-radio-list-item';
import '@material/dialog';
import '@material/mwc-button';
import type { Dialog } from '@material/mwc-dialog';

import type { RadioListItem } from '@material/mwc-list/mwc-radio-list-item';
import type { OscdFilteredList } from './foundation/components/oscd-filtered-list.js';

import './foundation/components/oscd-textfield.js';
import {
  selector,
  terminalSelector,
} from './foundation/identities/selector.js';
import { identity } from './foundation/identities/identity.js';

import { dfs } from './foundation/graph/dfs.js';

function hi<G, E, V>(
  accumulator: NodeIdentifier[],
  g: Graph<G, E, V>
): boolean {
  if (accumulator.length > 1) {
    const lastTwo = accumulator.slice(-2);
    const theEdge = g.edge(lastTwo[0], lastTwo[1]);
    if (theEdge && (<string>theEdge).includes('CT')) {
      return true;
    }
  }
  return false;
}

/**
 * TODO: Refactor more generally? Helinks does a weird thing for bus detection too.
 * Returns the buses associated with an SCD file, assuming their name always begins with `Bus`
 * @returns A map of buses at the substation with the keys being the `name` and the values being the elements.
 */
export function getBuses(doc: Element): Map<string, Element> | null {
  if (!doc) return null;
  const busesSCL = Array.from(
    doc.querySelectorAll(':root > Substation > VoltageLevel > Bay')
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

export function getBaysWithTerminal(
  doc: Element,
  nodePathName: string | null
): Array<Element> {
  if (nodePathName === null) return [];
  return Array.from(
    doc.querySelectorAll(':root > Substation > VoltageLevel > Bay')!
  ).filter(bay =>
    Array.from(bay.querySelectorAll('Terminal')).some(terminal =>
      terminal.getAttribute('connectivityNode')?.includes(nodePathName)
    )
  );
}

export function getConnectedBays(doc: Element, bayName: string): Element[] {
  const pathName =
    doc!
      .querySelector(
        `:root > Substation > VoltageLevel > Bay[name="${bayName}"] > ConnectivityNode`
      )
      ?.getAttribute('pathName') ?? null;
  return getBaysWithTerminal(doc, pathName) ?? [];
}

export function getBayElements(doc: Element, bayNames: string[]): Element[] {
  const bayElements: Element[] = [];
  bayNames.forEach(name => {
    const bay = doc!.querySelector(
      `:root > Substation > VoltageLevel > Bay[name="${name}"]`
    );
    if (bay) bayElements.push(bay);
  });
  return bayElements;
}

export function getLNodesFromBays(
  doc: Element,
  bayNames: string[],
  iedConnected = false
): Array<Element> {
  const lNodes: Element[] = [];
  const bays = getBayElements(doc, bayNames);

  bays.forEach(bay => {
    bay.querySelectorAll('LNode').forEach(lNode => {
      if (iedConnected && lNode.getAttribute('iedName') !== 'None') {
        lNodes.push(lNode);
      } else {
        lNodes.push(lNode);
      }
    });
  });
  return lNodes;
}

export function makeGraphvizOutput(
  graph: Graph<unknown, unknown, unknown>
): string {
  let graphvizOutput = '';
  graphvizOutput += `digraph G {`;
  graph.edges().forEach(edge => {
    graphvizOutput += `"${edge.v}" -> "${edge.w}" [label="${graph.edge(
      edge
    )}"]\n`;
  });
  graphvizOutput += `}`;
  return graphvizOutput;
}

// export function getConnectivityPath(doc: Element);

export function play(doc: Element): void {
  const g = new Graph({ directed: false });

  doc.querySelectorAll('Terminal').forEach(t => {
    g.setNode(t.getAttribute('connectivityNode')!, t);
  });

  doc.querySelectorAll('ConductingEquipment').forEach(ce => {
    const terminals = Array.from(ce.querySelectorAll('Terminal')).filter(
      t => !(t.getAttribute('cNodeName') === 'grounded')
    );
    if (terminals.length === 2) {
      g.setEdge(
        terminals[0]!.getAttribute('connectivityNode')!,
        terminals[1]!.getAttribute('connectivityNode')!,
        identity(ce)
      );
    } else if (terminals.length === 1) {
      // console.log('One', ce.getAttribute('name'));
      g.setNode(identity(ce), identity(ce));
      g.setEdge(
        identity(ce),
        terminals[0]!.getAttribute('connectivityNode')!,
        identity(ce)
      );
    }
  });

  doc.querySelectorAll('PowerTransformer').forEach(pt => {
    // transformer connections
    const terminals = Array.from(pt.querySelectorAll('Terminal'));
    if (terminals.length === 2) {
      g.setEdge(
        terminals[0]!.getAttribute('connectivityNode')!,
        terminals[1]!.getAttribute('connectivityNode')!,
        identity(pt)
      );
    }

    // neutral connections
    const windings = Array.from(pt.querySelectorAll('TransformerWinding'));
    windings.forEach(winding => {
      const terminal = winding.querySelector('Terminal');
      const neutral = winding.querySelector('NeutralPoint');
      if (neutral) {
        g.setNode(
          identity(neutral),
          neutral!.getAttribute('connectivityNode')!
        );
        g.setEdge(
          terminal!.getAttribute('connectivityNode')!,
          neutral!.getAttribute('connectivityNode')!,
          'Neutral'
        );
      }
    });
  });

  function getCtBoundedNodes<G, E, V>(
    gr: Graph<G, E, V>,
    pathName: string
  ): Record<any,any> {
    return dfs(
      gr,
      pathName,
      'pre',
      (accumulator: NodeIdentifier[], graph: Graph<G, E, V>, parents: Record<NodeIdentifier, null | NodeIdentifier>): boolean => {
        let theEdge;
        if (accumulator.length > 1) {
          const previousNodes = accumulator.slice(-1);
          theEdge = graph.edge(previousNodes[0], parents[previousNodes[0]]!);
          // console.log(theEdge)
          // theEdge = graph.edge(previousNodes[0], previousNodes[1]);
          // if (!theEdge) {
          //   theEdge = graph.edge(previousNodes[1], accumulator[0]);
          // }
          // console.log(accumulator)
          // , 'parents', parents)
          // console.log('p', parents)
          if (theEdge) {
            const sclConductingEquipment = doc.querySelector(
              selector('ConductingEquipment', <string>theEdge.toString())
            );
            if (sclConductingEquipment?.getAttribute('type') === 'CTR')
              return true;
          }
        }
        return false;
      }
    );
  }

  function getEquipmentFromNodes(
    boundedNodes: NodeIdentifier[]
  ): (Element | null)[] {
    let keptEquipment = [];
    if (boundedNodes.length > 1) {
      for (let index = 1; index < boundedNodes.length; index += 1) {
        const edge = g.edge(boundedNodes[index - 1], boundedNodes[index]);
        const edgeToInitialNode = g.edge(boundedNodes[0], boundedNodes[index]);
        if (edge) keptEquipment.push(edge.toString());
        if (edgeToInitialNode) keptEquipment.push(edgeToInitialNode.toString());
      }
    }
    keptEquipment = keptEquipment.map(kc => {
      const sclConductingEquipment = doc.querySelector(
        selector('ConductingEquipment', <string>kc.toString())
      );
      if (sclConductingEquipment) return sclConductingEquipment;
      return null;
    });
    return keptEquipment;
  }

  const myTerminal = doc
    .querySelector(':root > Substation PowerTransformer[name="T2"]')
    ?.querySelector('Terminal')
    ?.getAttribute('connectivityNode');
  //
  // console.log(myTerminal);
  // 'XAT/V220/Bus_A/L1'
  //
  // myTerminal!

  console.log(getCtBoundedNodes(g, 'XAT/V220/B240/L1').parents);

  // getEquipmentFromNodes(getCtBoundedNodes(g, 'XAT/V220/B240/L1' ))
  //   .filter(e => e?.getAttribute('type') === 'CTR')
  //   // eslint-disable-next-line no-console
  //   .forEach(e => console.log(e?.getAttribute('name')));

  // console.log(makeGraphvizOutput(g))
}

function getConnectedIeds(doc: Element, nodePathName: string): Array<string> {
  let lNodes: Element[] = [];
  // const connectedBays = getBaysWithTerminal(doc, nodePathName);
  // lNodes = getLNodesFromBays(doc, connectedBays);

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

export class CommunicationsDataPlugin extends LitElement {
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

  async docUpdate(): Promise<void> {
    await ((this.getRootNode() as ShadowRoot).host as LitElement)
      .updateComplete;
  }

  protected firstUpdated(): void {
    this.parentElement?.setAttribute('style', 'opacity: 1');
  }

  getItems(): TemplateResult {
    const buses = getBuses(this.doc.documentElement);
    if (buses !== null) {
      return html`${Array.from(buses.keys()).map(
        bus => html`<mwc-radio-list-item twoline value="${bus}"
          >${bus}</mwc-radio-list-item
        >`
      )}`;
    }
    return html`${nothing}`;
  }

  //           // getBusConnectedElements(doc.documentElement,
  //   (<RadioListItem>(
  //     this.filteredList.querySelector('mwc-radio-list-item[selected]')!
  //   )).value
  // )}
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
        @click="${() => true}
        disabled=false
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
