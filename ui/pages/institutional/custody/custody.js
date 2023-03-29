import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { debounce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { mmiActionsFactory } from '../../../store/institutional/institution-background';
import {
  ButtonIcon,
  Button,
  Text,
  Label,
  ICON_NAMES,
  ICON_SIZES,
  BUTTON_SIZES,
  BUTTON_TYPES,
} from '../../../components/component-library';
import {
  AlignItems,
  DISPLAY,
  FLEX_DIRECTION,
  FONT_WEIGHT,
  Color,
  JustifyContent,
  BorderRadius,
  BorderColor,
  BLOCK_SIZES,
  TextColor,
  TEXT_ALIGN,
} from '../../../helpers/constants/design-system';
import Box from '../../../components/ui/box';
import {
  CUSTODY_ACCOUNT_DONE_ROUTE,
  DEFAULT_ROUTE,
} from '../../../helpers/constants/routes';
import {
  getCurrentChainId,
  getProvider,
  getMmiConfiguration,
} from '../../../selectors';
// @TODO Fix import CustodyAccountList is merged
import CustodyAccountList from './account-list';
import JwtUrlForm from '../../../components/institutional/jwt-url-form';

const CustodyPage = () => {
  const t = useI18nContext();
  const history = useHistory();

  const mmiActions = mmiActionsFactory();
  const currentChainId = useSelector(getCurrentChainId);
  const provider = useSelector(getProvider);
  const custodians = useSelector(getMmiConfiguration);

  const [selectedAccounts, setSelectedAccounts] = useState({});
  const [selectedCustodianName, setSelectedCustodianName] = useState('');
  const [selectedCustodianImage, setSelectedCustodianImage] = useState(null);
  const [selectedCustodianDisplayName, setSelectedCustodianDisplayName] =
    useState('');
  const [selectedCustodianType, setSelectedCustodianType] = useState('');
  const [connectError, setConnectError] = useState('');
  const [currentJwt, setCurrentJwt] = useState('');
  const [selectError, setSelectError] = useState('');
  const [jwtList, setJwtList] = useState([]);
  const [apiUrl, setApiUrl] = useState('');
  const [addNewTokenClicked, setAddNewTokenClicked] = useState(false);
  const [chainId, setChainId] = useState(0);
  const [connectRequest, setConnectRequest] = useState(undefined);
  const [accounts, setAccounts] = useState();

  const handleSearchDebounce = useCallback(
    debounce(
      (currentJwt, apiUrl, input, selectedCustodianType, chainId) =>
        getCustodianAccountsByAddress(
          currentJwt,
          apiUrl,
          input,
          selectedCustodianType,
          chainId,
        ),
      300,
    ),
    [],
  );

  const fetchConnectRequest = async () => {
    const connectRequest = await mmiActions.getCustodianConnectRequest();
    setChainId(parseInt(currentChainId, 16));

    // check if it's empty object
    if (Object.keys(connectRequest).length) {
      setConnectRequest(connectRequest);
      setCurrentJwt(
        connectRequest.token || (await mmiActions.getCustodianToken()),
      );
      setSelectedCustodianType(connectRequest.custodianType);
      setSelectedCustodianName(connectRequest.custodianName);
      setApiUrl(connectRequest.apiUrl);
      connect();
    }
  };

  useEffect(() => {
    // call the function
    fetchConnectRequest()
      // make sure to catch any error
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (parseInt(chainId, 16) !== chainId) {
      setChainId(parseInt(currentChainId, 16));
      handleNetworkChange();
    }
  }, [currentChainId]);

  const handleNetworkChange = async () => {
    if (!isNaN(chainId)) {
      const jwt = currentJwt ? currentJwt : jwtList[0];

      if (jwt && jwt.length) {
        setAccounts(
          await getCustodianAccounts(jwt, apiUrl, selectedCustodianType, true),
        );
      }
    }
  };

  const connect = async () => {
    try {
      // If you have one JWT already, but no dropdown yet, currentJwt is null!
      const jwt = currentJwt ? currentJwt : jwtList[0];
      setConnectError('');
      const accounts = await getCustodianAccounts(
        jwt,
        apiUrl,
        selectedCustodianType,
        true,
      );
      setAccounts(accounts);
      trackEvent({
        category: 'MMI',
        event: 'Connect to custodian',
        properties: {
          custodian: selectedCustodianName,
          apiUrl: apiUrl,
          rpc: Boolean(connectRequest),
        },
      });
    } catch (e) {
      handleConnectError(e);
    }
  };

  const getCustodianAccounts = async () => {
    return await mmiActions.getCustodianAccounts(
      token,
      apiUrl,
      custody || selectedCustodianType,
      getNonImportedAccounts,
    );
  };

  const getCustodianAccountsByAddress = async (
    token,
    apiUrl,
    address,
    custody,
  ) => {
    try {
      const accounts = await mmiActions.getCustodianAccountsByAddress(
        token,
        apiUrl,
        address,
        custody,
      );
      setAccounts(accounts);
    } catch (e) {
      handleConnectError(e);
    }
  };

  const onSearchChange = (input) => {
    handleSearchDebounce(
      currentJwt,
      apiUrl,
      input,
      selectedCustodianType,
      chainId,
    );
  };

  const handleConnectError = () => {
    let errorMessage;
    const detailedError = e.message.split(':');

    if (detailedError.length > 1 && !isNaN(parseInt(detailedError[0], 10))) {
      if (parseInt(detailedError[0], 10) === 401) {
        // Authentication Error
        errorMessage =
          'Authentication error. Please ensure you have entered the correct token';
      }
    }

    if (/Network Error/u.test(e.message)) {
      errorMessage =
        'Network error. Please ensure you have entered the correct API URL';
    }

    if (!errorMessage) {
      errorMessage = e.message;
    }

    setConnectError(
      `Something went wrong connecting your custodian account. Error details: ${errorMessage}`,
    );
    trackEvent({
      category: 'MMI',
      event: 'Connect to custodian error',
      properties: {
        custodian: selectedCustodianName,
      },
    });
  };

  const renderSelectCustody = () => {
    const custodianButtons = [];
    custodians.forEach((custodian) => {
      if (
        (!custodian.production &&
          process.env.METAMASK_ENVIRONMENT === 'production') ||
        custodian.hidden ||
        (connectRequest &&
          Object.keys(connectRequest).length &&
          custodian.name !== selectedCustodianName)
      ) {
        return;
      }

      custodianButtons.push(
        <li
          key={uuidv4()}
          display={DISPLAY.FLEX}
          flexDirection={FLEX_DIRECTION.ROW}
          justifyContent={JustifyContent.flexEnd}
          alignItems={AlignItems.center}
          borderColor={BorderColor.borderDefault}
          borderRadius={BorderRadius.SM}
          padding={[3, 4]}
          marginBottom={4}
        >
          <span display={DISPLAY.FLEX} alignItems={AlignItems.center}>
            {custodian.iconUrl && (
              <img
                marginRight={2}
                width={32}
                height={32}
                src={custodian.iconUrl}
                alt={custodian.displayName}
              />
            )}
            {custodian.displayName}
          </span>

          <Button
            size={BUTTON_SIZES.SM}
            data-testid="custody-connect-button"
            onClick={async (_) => {
              const jwtList = await mmiActions.getCustodianJWTList(
                custodian.name,
              );
              setSelectedCustodianName(custodian.name);
              setSelectedCustodianType(custodian.type);
              setSelectedCustodianImage(custodian.iconUrl);
              setSelectedCustodianDisplayName(custodian.displayName);
              setApiUrl(custodian.apiUrl);
              setCurrentJwt(jwtList[0] || '');
              setJwtList(jwtList);
              trackEvent({
                category: 'MMI',
                event: 'Custodian Selected',
                properties: {
                  custodian: custodian.name,
                },
              });
            }}
          >
            {t('connectCustodialSelect')}
          </Button>
        </li>,
      );
    });

    return (
      <Box
        padding={[0, 7, 2]}
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.COLUMN}
      >
        <ButtonIcon
          ariaLabel={t('back')}
          iconName={ICON_NAMES.ARROW_LEFT}
          size={ICON_SIZES.SM}
          color={Color.iconDefault}
          onClick={() => history.push(DEFAULT_ROUTE)}
          display={DISPLAY.FLEX}
        />
        <Text as="h4" marginTop={4} marginBottom={4}>
          {t('connectCustodialAccountTitle')}
        </Text>
        <Text
          as="h6"
          color={TextColor.textDefault}
          marginTop={2}
          marginBottom={5}
        >
          {t('connectCustodialAccountMsg')}
        </Text>
        <Box>
          <ul width={BLOCK_SIZES.FULL}>{custodianButtons}</ul>
        </Box>
      </Box>
    );
  };

  const cancelConnectCustodianToken = () => {
    setSelectedCustodianName('');
    setSelectedCustodianType('');
    setSelectedCustodianImage(null);
    setSelectedCustodianDisplayName('');
    setApiUrl('');
    setCurrentJwt('');
    setConnectError('');
    setSelectError('');
  };

  const renderConnectButton = () => {
    return (
      <Box
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.ROW}
        justifyContent={JustifyContent.center}
        padding={[4, 0]}
      >
        <Button
          type={BUTTON_TYPES.SECONDARY}
          marginRight={4}
          onClick={() => {
            cancelConnectCustodianToken();
          }}
        >
          {t('cancel')}
        </Button>
        <Button
          data-testid="jwt-form-connect-button"
          onClick={connect}
          disabled={
            !selectedCustodianName || (addNewTokenClicked && !currentJwt)
          }
        >
          {t('connect')}
        </Button>
      </Box>
    );
  };

  const renderSelectAllAccounts = (e) => {
    const allAccounts = {};

    if (e.currentTarget.checked) {
      accounts.forEach((account) => {
        allAccounts[account.address] = {
          name: account.name,
          custodianDetails: account.custodianDetails,
          labels: account.labels,
          token: currentJwt,
          apiUrl: apiUrl,
          chainId: account.chainId,
          custodyType: selectedCustodianType,
          custodyName: selectedCustodianName,
        };
      });
      setSelectedAccounts(allAccounts);
    } else {
      setSelectedAccounts({});
    }
  };

  const renderSelectList = () => {
    return (
      <CustodyAccountList
        custody={selectedCustodianName}
        accounts={accounts}
        onAccountChange={(account) => {
          if (selectedAccounts[account.address]) {
            delete selectedAccounts[account.address];
          } else {
            selectedAccounts[account.address] = {
              name: account.name,
              custodianDetails: account.custodianDetails,
              labels: account.labels,
              token: currentJwt,
              apiUrl: apiUrl,
              chainId: account.chainId,
              custodyType: selectedCustodianType,
              custodyName: selectedCustodianName,
            };
          }

          setSelectedAccounts(selectedAccounts);
        }}
        provider={provider}
        selectedAccounts={selectedAccounts}
        onAddAccounts={async () => {
          try {
            await mmiActions.connectCustodyAddresses(
              selectedCustodianType,
              selectedCustodianName,
              selectedAccounts,
            );
            const selectedCustodian = custodians.find(
              (custodian) => custodian.name === selectedCustodianName,
            );
            history.push({
              pathname: CUSTODY_ACCOUNT_DONE_ROUTE,
              state: {
                imgSrc: selectedCustodian.iconUrl,
                title: t('custodianAccountAddedTitle'),
                description: t('custodianAccountAddedDesc'),
              },
            });
            trackEvent({
              category: 'MMI',
              event: 'Custodial accounts connected',
              properties: {
                custodian: selectedCustodianName,
                numberOfAccounts: Object.keys(selectedAccounts).length,
                chainId: chainId,
              },
            });
          } catch (e) {
            setSelectError(e.message);
          }
        }}
        onSearchChange={(input) => onSearchChange(input)}
        onCancel={() => {
          setAccounts(null);
          setSelectedCustodianName(null);
          setSelectedCustodianType(null);
          setSelectedAccounts({});
          setCurrentJwt('');
          setApiUrl('');
          setAddNewTokenClicked(false);

          if (Object.keys(connectRequest).length) {
            history.push(DEFAULT_ROUTE);
          }

          trackEvent({
            category: 'MMI',
            event: 'Connect to custodian cancel',
            properties: {
              custodian: selectedCustodianName,
              numberOfAccounts: Object.keys(selectedAccounts).length,
              chainId: chainId,
            },
          });
        }}
      />
    );
  };

  const renderCustodyContent = () => {
    if (!accounts && !selectedCustodianType) {
      return renderSelectCustody();
    }

    if (!accounts && selectedCustodianType) {
      return (
        <>
          <Box
            padding={[0, 7, 2]}
            display={DISPLAY.FLEX}
            flexDirection={FLEX_DIRECTION.COLUMN}
          >
            <ButtonIcon
              ariaLabel={t('back')}
              iconName={ICON_NAMES.ARROW_LEFT}
              size={ICON_SIZES.SM}
              color={Color.iconAlternative}
              onClick={() => cancelConnectCustodianToken()}
              display={[DISPLAY.FLEX]}
            />
            <Text as="h4">
              <span display={DISPLAY.FLEX} alignItems={AlignItems.center}>
                {selectedCustodianImage && (
                  <img
                    marginRight={2}
                    width={32}
                    height={32}
                    src={selectedCustodianImage}
                    alt={selectedCustodianDisplayName}
                  />
                )}
                {selectedCustodianDisplayName}
              </span>
            </Text>
            <Text marginTop={4} marginBottom={4}>
              {t('enterCustodianToken', [selectedCustodianDisplayName])}
            </Text>
          </Box>
          <Box paddingTop={7} paddingBottom={7}>
            <JwtUrlForm
              jwtList={jwtList}
              currentJwt={currentJwt}
              onJwtChange={(jwt) => {}}
              jwtInputText={t('pasteJWTToken')}
              apiUrl={apiUrl}
              urlInputText={t('custodyApiUrl', [selectedCustodianDisplayName])}
              onUrlChange={(url) => {}}
            />
            {renderConnectButton()}
          </Box>
        </>
      );
    }

    if (accounts.length > 0) {
      return (
        <>
          <Box
            borderColor={BorderColor.borderDefault}
            padding={[5, 7, 2]}
            width={BLOCK_SIZES.FULL}
          >
            <Text as="h4">{t('selectAnAccount')}</Text>
            <Text marginTop={2} marginBottom={5}>
              {t('selectAnAccountHelp')}
            </Text>
          </Box>
          <Box
            padding={[5, 7, 0]}
            display={DISPLAY.FLEX}
            flexDirection={FLEX_DIRECTION.ROW}
            justifyContent={JustifyContent.flexStart}
            alignItems={AlignItems.center}
            className="custody-select-all"
          >
            <input
              type="checkbox"
              id="selectAllAccounts"
              name="selectAllAccounts"
              marginRight={2}
              marginLeft={2}
              value={{}}
              onChange={(e) => renderSelectAllAccounts(e)}
              checked={Object.keys(selectedAccounts).length === accounts.length}
            />
            <Label htmlFor="selectAllAccounts">{t('selectAllAccounts')}</Label>
          </Box>
          {renderSelectList()}
        </>
      );
    }

    return null;
  };

  const renderAllAccountsConnected = () => {
    if (accounts && accounts.length === 0) {
      return (
        <Box
          data-testid="custody-accounts-empty"
          padding={[6, 7, 2]}
          className="custody-accounts-empty"
        >
          <Text
            marginBottom={2}
            fontWeight={FONT_WEIGHT.BOLD}
            color={TextColor.textDefault}
            className="custody-accounts-empty__title"
          >
            {t('allCustodianAccountsConnectedTitle')}
          </Text>
          <Text className="custody-accounts-empty__subtitle">
            {t('allCustodianAccountsConnectedSubtitle')}
          </Text>

          <Box padding={[5, 7]} className="custody-accounts-empty__footer">
            <Button
              size={BUTTON_SIZES.LG}
              type={BUTTON_TYPES.SECONDARY}
              onClick={() => history.push(DEFAULT_ROUTE)}
            >
              {t('close')}
            </Button>
          </Box>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box>
      {connectError && (
        <Text textAlign={TEXT_ALIGN.CENTER} marginTop={3} padding={[2, 7, 5]}>
          {connectError}
        </Text>
      )}

      {selectError && (
        <Text textAlign={TEXT_ALIGN.CENTER} marginTop={3} padding={[2, 7, 5]}>
          {selectError}
        </Text>
      )}

      {renderCustodyContent()}

      {renderAllAccountsConnected()}
    </Box>
  );
};

export default CustodyPage;