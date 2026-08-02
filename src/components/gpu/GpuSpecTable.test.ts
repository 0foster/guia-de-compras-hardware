import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as cheerio from 'cheerio';
import GpuSpecTable from './GpuSpecTable.astro';

const defaultProps = {
  vram: 16,
  vramType: 'GDDR7' as const,
  tdp: 300,
  cudaCores: 8960,
  baseClock: 2340,
  boostClock: 2452,
  memoryBus: 256,
  memoryBandwidth: 896,
  pciExpress: '5.0 x16',
  recommendedPsu: 800,
  displayOutputs: {
    hdmi: '2.1a',
    displayPort: '2.1b',
    totalOutputs: 4,
  },
};

describe('GpuSpecTable', () => {
  it('renders spec sections', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    // Uses div-based layout, not <table>
    expect(html).toContain('Memória');
    expect(html).toContain('Performance');
    expect(html).toContain('Energia');
    expect(html).toContain('Conectividade');
  });

  it('displays VRAM with type', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('16');
    expect(html).toContain('GDDR7');
  });

  it('displays TDP', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('300');
  });

  it('displays CUDA cores', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    // CUDA cores are formatted with pt-BR locale (8.960)
    expect(html).toContain('8.960');
  });

  it('displays clock speeds', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('2340');
    expect(html).toContain('2452');
  });

  it('displays memory bus width', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('256');
  });

  it('displays memory bandwidth', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('896');
  });

  it('displays PCIe version', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('5.0 x16');
  });

  it('displays recommended PSU', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('800');
  });

  it('displays display outputs', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuSpecTable, {
      props: defaultProps,
    });

    expect(html).toContain('HDMI');
    expect(html).toContain('DisplayPort');
  });
});
