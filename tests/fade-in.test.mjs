/**
 * Fade-in decision tests.
 *
 * The engine itself needs a browser (MutationObserver, Web Animations), but
 * the decisions that determine what flashes on screen are pure:
 *
 * 1. which inserted nodes are content (rows and block-level prose) versus
 *    inline churn, hidden nodes, or host-owned fold animations;
 * 2. which node in a React commit is the visual unit (outermost only);
 * 3. whether the addition belongs to the live tail rather than a history
 *    prepend;
 * 4. whether the batch is small enough to animate at all.
 *
 * Plain objects stand in for elements so these run without a DOM.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/**
 * Build a minimal element-shaped node.
 * @param tagName - uppercase tag name.
 * @param options - parent, attributes, and children.
 * @returns the fake node.
 */
function node(tagName, { parent = null, attrs = {}, children = [] } = {}) {
  const values = new Map(Object.entries(attrs))
  const element = {
    nodeType: 1,
    tagName,
    parentElement: parent,
    children,
    hasAttribute: name => values.has(name),
    getAttribute: name => values.has(name) ? values.get(name) : null,
  }
  for (const child of children) child.parentElement = element
  return element
}

test('rows and block prose are candidates; inline and chrome nodes are not', async () => {
  const { isFadeCandidate } = await loadModule('fade-in')

  assert.equal(isFadeCandidate(node('DIV', { attrs: { 'data-chat-flow-key': 'row' } })), true, 'chat row')
  assert.equal(isFadeCandidate(node('DIV', { attrs: { 'data-chat-call-id': 'call' } })), true, 'tool call')
  assert.equal(isFadeCandidate(node('P')), true, 'markdown paragraph')
  assert.equal(isFadeCandidate(node('LI')), true, 'appended list item')
  assert.equal(isFadeCandidate(node('PRE')), true, 'code block')
  assert.equal(isFadeCandidate(node('TR')), true, 'table row')

  assert.equal(isFadeCandidate(node('SPAN')), false, 'inline text must not flash')
  assert.equal(isFadeCandidate(node('A')), false, 'link must not flash')
  assert.equal(isFadeCandidate(node('SCRIPT')), false, 'non-content tag')
  assert.equal(isFadeCandidate(node('DIV')), false, 'plain layout wrapper')
  assert.equal(isFadeCandidate(node('DIV', { attrs: { 'data-chat-turn-spacer': '' } })), false, 'spacer')
  assert.equal(isFadeCandidate(node('P', { attrs: { hidden: '' } })), false, 'hidden block')
  assert.equal(isFadeCandidate(node('P', { attrs: { 'data-chat-motion': 'collapse' } })), false, 'host owns motion')
  assert.equal(isFadeCandidate(node('P', { attrs: { 'aria-hidden': 'true' } })), false, 'hidden from AT')
  assert.equal(isFadeCandidate(node('P', { attrs: { 'aria-hidden': 'false' } })), true, 'explicitly visible')
})

test('only the outermost inserted node is the visual unit', async () => {
  const { outermostAdditions } = await loadModule('fade-in')

  const child = node('P')
  const row = node('DIV', { attrs: { 'data-chat-flow-key': 'row' }, children: [child] })
  const sibling = node('P')

  assert.deepEqual(outermostAdditions([row, child, sibling]), [row, sibling])
  assert.deepEqual(outermostAdditions([child, child]), [child], 'duplicates collapse')
  assert.deepEqual(outermostAdditions([]), [])
})

test('a wrapper qualifies when it contains a content block', async () => {
  const { containsFadeCandidate } = await loadModule('fade-in')

  const paragraph = node('P')
  const wrapper = node('DIV', { children: [node('DIV', { children: [paragraph] })] })
  assert.equal(containsFadeCandidate(wrapper), true)
  assert.equal(containsFadeCandidate(node('DIV', { children: [node('SPAN')] })), false)
  assert.equal(containsFadeCandidate(node('DIV')), false)
})

test('history prepends are outside the live tail window', async () => {
  const { isInTailWindow } = await loadModule('fade-in')

  const rows = Array.from({ length: 20 }, (_, index) => node('DIV', { attrs: { 'data-chat-flow-key': String(index) } }))
  const column = node('DIV', { children: rows })

  assert.equal(isInTailWindow(rows[19], column), true, 'the newest row')
  assert.equal(isInTailWindow(rows[0], column), false, 'a history prepend')

  const nested = node('P')
  rows[19].children.push(nested)
  nested.parentElement = rows[19]
  assert.equal(isInTailWindow(nested, column), true, 'a block inside the newest row')

  const oldNested = node('P')
  rows[0].children.push(oldNested)
  oldNested.parentElement = rows[0]
  assert.equal(isInTailWindow(oldNested, column), false, 'a block inside an old row')

  assert.equal(isInTailWindow(rows[16], column, 3), false, 'just outside a 3-row window')
  assert.equal(isInTailWindow(rows[17], column, 3), true, 'inside a 3-row window')
  assert.equal(isInTailWindow(node('DIV'), column), false, 'not in this column')
})

test('bulk loads are skipped instead of flashing the whole transcript', async () => {
  const { shouldFadeBatch, FADE_IN_MAX_BATCH, FADE_IN_MAX_NODES } = await loadModule('fade-in')

  assert.equal(shouldFadeBatch(1, 1), true, 'one streamed block')
  assert.equal(shouldFadeBatch(FADE_IN_MAX_BATCH, FADE_IN_MAX_NODES), true, 'at both limits')
  assert.equal(shouldFadeBatch(FADE_IN_MAX_BATCH + 1, 1), false, 'too many animated blocks')
  assert.equal(shouldFadeBatch(1, FADE_IN_MAX_NODES + 1), false, 'too many inserted nodes')
  assert.equal(shouldFadeBatch(0, 1), false, 'nothing to animate')
})
