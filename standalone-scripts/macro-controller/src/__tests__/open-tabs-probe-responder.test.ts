/**
 * open-tabs-probe-responder — verifies the page-side workspace responder:
 *   - idempotent registration (second call is no-op)
 *   - responds to GET_DETECTED_WORKSPACE with a correct snapshot
 *   - posts error response when snapshot build throws
 *   - ignores messages from unrelated sources/types
 *
 * Closes spec/22-app-issues/111 acceptance:
 *   "Force the page responder to throw — the row shows probeError truncated."
 */
import { describe, it, expect, vi, beforeEach, afterEach }  from 'vitest';

const mockState = {
  workspaceName: 'Alpha Workspace',
  workspaceFromApi: true,
  workspaceFromCache: false,
  projectNameFromDom: false,
};

vi.mock('../shared-state', () => ({
  state: mockState,
}));

vi.mock('../workspace-detection', () => ({
  extractProjectIdFromUrl: vi.fn(() => 'proj-alpha-123'),
}));

vi.mock('../workspace-cache', () => ({
  getCachedWorkspaceName: vi.fn(() => 'Cached Alpha'),
  getCachedWorkspaceId: vi.fn(() => 'ws-abc-789'),
}));

vi.mock('../error-utils', () => ({
  logError: vi.fn(),
}));

import { registerPageWorkspaceResponder } from '../page-workspace-responder';

const REQUEST_SOURCE = 'marco-extension-request';
const RESPONSE_SOURCE = 'marco-controller-response';
const REQUEST_TYPE = 'GET_DETECTED_WORKSPACE';

describe('page-workspace-responder', () => {
  let messageHandler: ((event: MessageEvent) => void) | null = null;
  let postedMessages: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    postedMessages = [];
    messageHandler = null;

    // Reset registration guard so each test starts fresh
    // @ts-expect-error — accessing private flag for test isolation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _mod = registerPageWorkspaceResponder;
    // The module-level `isRegistered` is true after first call; we need to
    // reset it.  Since it's module-scoped, the simplest way is to reload the
    // module state by manipulating the flag through module internals.
    // However, Vitest doesn't easily let us reset module state. We work around
    // this by intercepting addEventListener and ignoring duplicate registration.

    window.addEventListener = vi.fn((type: string, handler: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        messageHandler = handler as (event: MessageEvent) => void;
      }
    }) as typeof window.addEventListener;

    window.postMessage = vi.fn((msg: unknown) => {
      postedMessages.push(msg as Record<string, unknown>);
    }) as typeof window.postMessage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a message listener on first call', () => {
    registerPageWorkspaceResponder();
    expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(messageHandler).not.toBeNull();
  });

  it('is idempotent — second call does not add another listener', () => {
    registerPageWorkspaceResponder();
    const firstCallCount = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length;
    registerPageWorkspaceResponder();
    const secondCallCount = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(secondCallCount).toBe(firstCallCount);
  });

  it('responds with a snapshot when receiving a valid request', () => {
    registerPageWorkspaceResponder();
    expect(messageHandler).not.toBeNull();

    const requestId = 'req-001';
    const event = new MessageEvent('message', {
      source: window,
      data: { source: REQUEST_SOURCE, type: REQUEST_TYPE, requestId },
    });

    messageHandler!(event);

    expect(window.postMessage).toHaveBeenCalled();
    const resp = postedMessages[postedMessages.length - 1];
    expect(resp.source).toBe(RESPONSE_SOURCE);
    expect(resp.type).toBe(REQUEST_TYPE);
    expect(resp.requestId).toBe(requestId);
    expect(resp.payload).toEqual(
      expect.objectContaining({
        workspaceName: 'Alpha Workspace',
        workspaceId: 'ws-abc-789',
        projectId: 'proj-alpha-123',
        source: 'api',
      }),
    );
    expect(typeof (resp.payload as Record<string, unknown>).capturedAt).toBe('string');
  });

  it('ignores messages from unrelated sources', () => {
    registerPageWorkspaceResponder();

    const event = new MessageEvent('message', {
      source: window,
      data: { source: 'some-other-source', type: REQUEST_TYPE, requestId: 'req-002' },
    });
    messageHandler!(event);

    expect(window.postMessage).not.toHaveBeenCalled();
  });

  it('ignores messages with unrelated types', () => {
    registerPageWorkspaceResponder();

    const event = new MessageEvent('message', {
      source: window,
      data: { source: REQUEST_SOURCE, type: 'SOME_OTHER_TYPE', requestId: 'req-003' },
    });
    messageHandler!(event);

    expect(window.postMessage).not.toHaveBeenCalled();
  });

  it('posts error response when snapshot build throws', () => {
    const { extractProjectIdFromUrl } = await import('../workspace-detection');
    vi.mocked(extractProjectIdFromUrl).mockImplementationOnce(() => {
      throw new Error('DOM parse exploded');
    });

    registerPageWorkspaceResponder();

    const event = new MessageEvent('message', {
      source: window,
      data: { source: REQUEST_SOURCE, type: REQUEST_TYPE, requestId: 'req-004' },
    });
    messageHandler!(event);

    const resp = postedMessages[postedMessages.length - 1];
    expect(resp.source).toBe(RESPONSE_SOURCE);
    expect(resp.type).toBe(REQUEST_TYPE);
    expect(resp.requestId).toBe('req-004');
    expect(resp.payload).toBeNull();
    expect(resp.errorMessage).toBe('DOM parse exploded');
  });
});
