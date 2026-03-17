import { Label, Popover, Flex, FlexItem } from '@patternfly/react-core';
import { BADGE_DEFINITIONS } from '../utils/badgeSystem';

function BadgeDisplay({ badges }) {
  if (!badges || badges.length === 0) {
    return null;
  }

  // Limit to 3 badges
  const displayBadges = badges.slice(0, 3);

  return (
    <Flex spaceItems={{ default: 'spaceItemsXs' }}>
      {displayBadges.map((badgeId) => {
        const badge = BADGE_DEFINITIONS[badgeId];

        if (!badge) {
          return null;
        }

        return (
          <FlexItem key={badgeId}>
            <Popover
              headerContent={badge.label}
              bodyContent={badge.description}
            >
              <Label color={badge.color} isCompact>
                {badge.label}
              </Label>
            </Popover>
          </FlexItem>
        );
      })}
    </Flex>
  );
}

export default BadgeDisplay;
