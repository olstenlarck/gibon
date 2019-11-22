/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable import/extensions */

import { checkHeader } from '../../src/header';

test('.checkHeader throw if not object given', () => {
  /**
   * ? I guess it make sense of such tests,
   * because some users not use typescript,
   * or at least does not follow so what the
   * editor completions/suggestions/intellisense showing them.
   * ? I may reconsider this in future.
   */

  // @ts-ignore
  expect(() => checkHeader({})).toThrow(TypeError);
  // @ts-ignore
  expect(() => checkHeader([])).toThrow(TypeError);
  // @ts-ignore
  expect(() => checkHeader(null)).toThrow(TypeError);
  // @ts-ignore
  expect(() => checkHeader(123)).toThrow(/type should be non empty string/);
});

test('.checkHeader throw if header.type is not a string', () => {
  // @ts-ignore
  expect(() => checkHeader({ foo: 'bar' })).toThrow(
    /type should be non empty string/,
  );
});

test('.checkHeader throw if header.subject is not a string', () => {
  // @ts-ignore
  expect(() => checkHeader({ type: 'fix' })).toThrow(
    /subject should be non empty string/,
  );

  expect(() => checkHeader({ type: 'fix', subject: '' })).toThrow(
    /subject should be non empty string/,
  );
});

test('.checkHeader throw if header.scope is not a string when given', () => {
  expect(() =>
    // @ts-ignore
    checkHeader({ type: 'fix', subject: 'qux zaz', scope: 123 }),
  ).toThrow(/scope should be non empty string when given/);
});

test('.checkHeader should header.scope be `null` when explicitly null given', () => {
  const result = checkHeader({ type: 'fix', subject: 'ss', scope: null });
  expect(result).toMatchObject({ type: 'fix', subject: 'ss', scope: null });
});

test('.checkHeader should header.scope be null when not given', () => {
  const res = checkHeader({ type: 'aaa', subject: 'quxie bar' });
  expect(res).toMatchObject({ type: 'aaa', subject: 'quxie bar', scope: null });
});

test('.checkHeader correctly header object without scope', () => {
  const result = checkHeader({
    type: 'fix',
    subject: 'bar qux',
  });

  expect(result).toMatchObject({
    type: 'fix',
    scope: null,
    subject: 'bar qux',
  });
});

test('.checkHeader object with scope', () => {
  const header = {
    type: 'feat',
    scope: 'quxie',
    subject: 'woo hoo',
  };

  expect(checkHeader(header)).toMatchObject(header);
});