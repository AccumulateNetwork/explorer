import { Descriptions, Tooltip } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine, RiQuestionLine } from 'react-icons/ri';

import { Account, AccountType } from 'accumulate.js/lib/core';

import { getParentUrl } from '../../../utils/url';
import { Link } from '../../common/Link';
import { Nobr } from '../../common/Nobr';
import tooltipDescs from '../../common/TooltipDescriptions';

export function ParentDesc({ account }: { account: Account }) {
  let lite = false;
  switch (account.type) {
    case AccountType.LiteIdentity:
    case AccountType.LiteDataAccount:
      return null;

    case AccountType.LiteTokenAccount:
      lite = true;
  }

  const parentUrl = lite
    ? new URL(`acc://${account.url.authority}`)
    : getParentUrl(account.url);
  if (!parentUrl) return null;

  const tooltip = lite ? tooltipDescs.lightIdentityUrl : tooltipDescs.adiUrl;
  const labelTxt = lite ? 'Identity' : 'ADI';
  const label = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip overlayClassName="explorer-tooltip" title={tooltip}>
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        {labelTxt}
      </Nobr>
    </span>
  );

  return (
    <Descriptions.Item label={label}>
      <Link to={parentUrl}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiAccountCircleLine />
        </IconContext.Provider>
        {parentUrl.toString()}
      </Link>
    </Descriptions.Item>
  );
}
