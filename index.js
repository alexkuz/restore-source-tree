import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { SourceMapConsumer } from 'source-map';
import { Command } from 'commander';
import { version } from './package.json';

const WEBPACK_PREFIX = 'webpack:///';
const WEBPACK_FOOTER = '/** WEBPACK FOOTER **';

const program = new Command('restore-source-tree')
  .version(version)
  .usage('[options] <file>')
  .description('Restores file structure from source map')
  .option('-o, --out-dir [dir]', 'Output directory (\'output\' by default)', 'output')
  .option('-n, --include-node-modules', 'Include source files in node_modules')
  .parse(process.argv);

if (program.args.length === 0) {
  program.outputHelp();
  process.exit(1);
}

const readJson = filename => {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch(e) {
    console.error(`Parsing file '${filename}' failed: ${e.message}`);
    process.exit(1);
  }
}

const getSourceList = smc => {
  let sources = smc.sources
    .filter(src => src.startsWith(WEBPACK_PREFIX))
    .map(src => [src.replace(WEBPACK_PREFIX, ''), src])
    .filter(([filePath]) => !filePath.startsWith('(webpack)'));

  if (!program.includeNodeModules) {
    sources = sources.filter(([filePath]) => !filePath.startsWith('~/'));
  }
  
  return sources;
}

const trimFooter = str => str.substr(0, str.indexOf(WEBPACK_FOOTER)).trimRight() + '\n';

const saveSourceContent = (smc, filePath, src) => {
  const content = trimFooter(smc.sourceContentFor(src));
  const outPath = path.join(program.outDir, filePath);
  const dir = path.dirname(outPath);

  if (content.length < 2) return;

  mkdirp(dir, err => {
    if (err) {
      console.error('Failed creating directory', dir);
      process.exit(1);
    } else {
      fs.writeFile(outPath, content, err => {
        if (err) {
          console.error('Failed writing file', outPath);
          process.exit(1);
        }
      });
    }
  })
}

function processFile(filename) {
  const json = readJson(filename);

  const smc = new SourceMapConsumer(json);
  
  const sources = getSourceList(smc);

  sources.forEach(([filePath, src]) => saveSourceContent(smc, filePath, src));

  console.log(`Processed ${sources.length} files`);
}

const filename = program.args[0];

fs.access(filename, err => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }

  processFile(filename);
});

