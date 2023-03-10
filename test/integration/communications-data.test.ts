import { expect, fixture, html } from '@open-wc/testing';

import CommunicationsDataPlugin from '../../oscd-communications-data.js';

if (!customElements.get('communications-data'))
  customElements.define('communications-data', CommunicationsDataPlugin);

describe('Export Communication section functions', () => {
  let element: CommunicationsDataPlugin;
  let doc: XMLDocument;

  beforeEach(async () => {
    doc = await fetch('/test/testfiles/XAT.ssd')
      .then(response => response.text())
      .then(str => new DOMParser().parseFromString(str, 'application/xml'));

    element = await fixture(
      html`<communications-data
        .doc=${doc}
        .docName=${'XAT.ssd'}
      ></communications-data>`
    );

    await element.updateComplete;
  });

  // it('looks like the latest snapshot', async () => {
  //   await expect(element).shadowDom.to.equalSnapshot();
  // });

  it('can detect 4 x buses', async () => {
    const buses = element.getBuses()
    const result = Array.from(buses!.keys())
    expect(result).to.eql(['Bus_A', 'Bus_B', 'Bus_K', 'Bus_L'])
  });

  it('can detect equipment connected to a bus', async () => {
    expect(element.getBusConnectedElements('Bus_A')).to.equal(['Bus_Z', 'Bus_B', 'Bus_K', 'Bus_L'])
  });

});
