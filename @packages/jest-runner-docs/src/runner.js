'use strict';

/* eslint-disable max-statements */
const path = require('path');

const {
  pass,
  skip,
  runner,
  utils,
} = require('@tunnckocore/create-jest-runner');
const { isMonorepo } = require('@tunnckocore/utils');
const fs = require('fs-extra');
const findPkg = require('find-pkg');

const docks = require('./docks');

process.env.NODE_ENV = 'docs';

module.exports = runner('docks', async (ctx) => {
  const start = Date.now();
  const { testPath, config, runnerConfig, memoizer } = ctx;

  const docksConfig = {
    promo: true,
    flat: true,
    verbose: true,
    force: true,
    fileHeading: true, // default `false`
    outfile: '.verb.md',
    ...runnerConfig,
  };
  docksConfig.outfile = docksConfig.outfile || docksConfig.outFile;
  docksConfig.fileHeading = docksConfig.flat !== true;

  /** Find correct root path */
  function getPkgRoot() {
    return isMonorepo(config.cwd)
      ? path.dirname(findPkg.sync(path.dirname(testPath)))
      : config.rootDir;
  }
  const pkgRoot = getPkgRoot();

  docksConfig.pkgRoot = pkgRoot;

  const testPathContents = await fs.readFile(testPath, 'utf-8');
  let apidocsContent = null;

  const outfile = await utils.tryCatch(
    async () => {
      const resDocs = docks(testPath, docksConfig);
      apidocsContent = resDocs.contents;

      if (apidocsContent.length === 0 && !docksConfig.force) {
        return {
          skip: skip({
            start,
            end: new Date(),
            test: {
              path: testPath,
              title: 'Docks',
            },
          }),
        };
      }

      const relPath = path.relative(pkgRoot, testPath);
      const oldBasename = path.basename(relPath, path.extname(relPath));
      const mdBasename = `${oldBasename}.md`;
      const relDocsPath = path.join('docs', path.dirname(relPath), mdBasename);
      const outputFile = path.join(pkgRoot, relDocsPath);

      const promo = docksConfig.promo
        ? `_Generated using [jest-runner-docs](https://ghub.now.sh/jest-runner-docs)._`
        : '';

      const header = docksConfig.fileHeading ? `\n\n## ${relPath}` : '';
      const docksStart = '<!-- docks-start -->';
      const docksEnd = '<!-- docks-end -->';
      const cont =
        apidocsContent.length > 0
          ? `${header}\n\n${promo}\n\n${apidocsContent.trim()}\n\n`
          : '\n';

      await fs.outputFile(outputFile, cont);
      // const outDir = path.dirname(outputFile);
      // if (!fs.existsSync(outDir)) {
      //   await mkdirp(outDir, { recursive: true });
      // }
      // // fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      // await writeFile(outputFile, cont);

      const pkgVerbMd = path.join(pkgRoot, docksConfig.outfile);
      if (fs.existsSync(pkgVerbMd)) {
        const fileContents = await fs.readFile(pkgVerbMd, 'utf8');
        if (
          fileContents.includes(docksStart) &&
          fileContents.includes(docksEnd)
        ) {
          const idxStart = fileContents.indexOf(docksStart) + docksStart.length;
          const idxEnd = fileContents.indexOf(docksEnd);
          const oldApiContents = fileContents.slice(idxStart, idxEnd).trim();
          const newContents = `\n{%= include(process.cwd() + ${JSON.stringify(
            `/${relDocsPath}`,
          )}) %}\n`;

          if (!oldApiContents.includes(newContents.trim())) {
            const beforeApi = fileContents.slice(0, idxStart);
            const api = `\n\n${oldApiContents}${newContents}\n`;
            const afterApi = fileContents.slice(idxEnd);

            await fs.outputFile(pkgVerbMd, `${beforeApi}${api}${afterApi}`);
          }
        }
      } else {
        await fs.outputFile(pkgVerbMd, `${docksStart}\n${docksEnd}\n`);
      }

      return outputFile;
    },
    { testPath, start, cfg: docksConfig },
  );

  if (outfile.hasError) return outfile.error;
  if (outfile.skip) return outfile.skip;

  const postHook =
    typeof docksConfig.postHook === 'function'
      ? docksConfig.postHook
      : () => {};

  async function postHookFunc(fp, contents) {
    await postHook({
      pkgRoot,
      jestConfig: config,
      docksConfig,
      outfile,
      outFile: outfile,
      testPath: fp,
      contents,
    });

    return { fp, docksConfig, apidocsContent, contents };
  }

  const res = await utils.tryCatch(
    async () => {
      const hookMemoized = await memoizer.memoize(postHookFunc, {
        cacheId: 'posthook',
      });
      await hookMemoized(testPath, testPathContents);
    },
    { start, testPath, runnerConfig: docksConfig },
  );
  if (res && res.hasError) return res.error;

  return pass({
    start,
    end: new Date(),
    test: {
      path: outfile,
      title: 'Docks',
    },
  });
});
