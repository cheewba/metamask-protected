import { ListNames, PhishingController } from '@metamask/phishing-controller';
import { ControllerMessenger } from '@metamask/base-controller';
import { isBlockedUrl } from './isBlockedUrl';

describe('isBlockedUrl', () => {
  const messenger = new ControllerMessenger();
  const phishingControllerMessenger = messenger.getRestricted({
    name: 'PhishingController',
    allowedActions: [],
    allowedEvents: [],
  });
  const phishingController = new PhishingController({
    messenger: phishingControllerMessenger,
    state: {
      phishingLists: [
        {
          blocklist: ['https://metamask.test'],
          allowlist: [],
          fuzzylist: [],
          tolerance: 0,
          version: 1,
          lastUpdated: 0,
          name: ListNames.MetaMask,
        },
      ],
    },
  });

  // @ts-expect-error This is missing from the Mocha type definitions
  it.each([
    ['http://metamask.io', false],
    ['https://metamask.io', false],
    ['https://metamask.test', true],
    ['sftp://metamask.io', true],
    ['', true],
    ['1', true],
    [undefined, true],
    [null, true],
    [1, true],
    [0, true],
    [-1, true],
    // TODO: Replace `any` with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ])('"%s" is blocked: %s', async (url: any, expected: boolean) => {
    const result = await isBlockedUrl(
      url,
      async () => {
        return await phishingController.maybeUpdateState();
      },
      (origin: string) => {
        return phishingController.test(origin);
      },
    );
    expect(result).toEqual(expected);
  });
});
