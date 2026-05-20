import { createServer } from 'vite';

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true }
});

try {
  const tools = await server.ssrLoadModule('/src/tools/ContentAuthoringTools.ts');
  const report = tools.createContentAuthoringReport(undefined, Date.now());
  const output = asJson ? tools.exportContentAuthoringReport(report) : tools.formatContentAuthoringReport(report);
  console.log(output);
  process.exitCode = report.validation.ok ? 0 : 1;
} finally {
  await server.close();
}
