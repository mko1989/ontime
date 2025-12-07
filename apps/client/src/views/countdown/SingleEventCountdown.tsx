import { IoPencil } from 'react-icons/io5';
import { MaybeNumber, OntimeEvent } from 'ontime-types';
import { getExpectedStart } from 'ontime-utils';

import Button from '../../common/components/buttons/Button';
import { useFadeOutOnInactivity } from '../../common/hooks/useFadeOutOnInactivity';
import { useCountdownSocket, useExpectedStartData } from '../../common/hooks/useSocket';
import useReport from '../../common/hooks-query/useReport';
import { ExtendedEntry } from '../../common/utils/rundownMetadata';
import { cx } from '../../common/utils/styleUtils';
import { FitText } from '../../common/components/fit-text/FitText';
import SuperscriptTime from '../../features/viewers/common/superscript-time/SuperscriptTime';
import { getPropertyValue } from '../../features/viewers/common/viewUtils';

import { useCountdownOptions } from './countdown.options';
import { useSubscriptionDisplayData } from './countdown.utils';
import { ScheduleTime } from './CountdownSubscriptions';

import './SingleEventCountdown.scss';

interface SingleEventCountdownProps {
  subscribedEvent: ExtendedEntry<OntimeEvent>;
  goToEditMode: () => void;
}

export default function SingleEventCountdown({ subscribedEvent, goToEditMode }: SingleEventCountdownProps) {
  const { secondarySource, showExpected } = useCountdownOptions();
  const showFab = useFadeOutOnInactivity(true);
  const { data: reportData } = useReport();

  const { offset, currentDay, actualStart, plannedStart, mode } = useExpectedStartData();
  const { totalGap, isLinkedToLoaded } = subscribedEvent;
  const expectedStart = getExpectedStart(subscribedEvent, {
    currentDay,
    totalGap,
    actualStart,
    plannedStart,
    isLinkedToLoaded,
    offset,
    mode,
  });

  const { endedAt } = reportData[subscribedEvent.id] ?? { endedAt: null };
  const countdownEvent = { ...subscribedEvent, expectedStart, endedAt };
  const title = subscribedEvent.title.length ? subscribedEvent.title : ' '; // insert utf-8 empty space to avoid the line collapsing
  const secondaryData = getPropertyValue(subscribedEvent, secondarySource);

  return (
    <div className='single-container' data-testid='countdown-event'>
      <SubscriptionStatus event={countdownEvent} />
      <div className='event__title' style={{ borderColor: countdownEvent.colour }}>
        <ScheduleTime event={countdownEvent} showExpected={showExpected} />
        {title}
        {secondaryData && <div className='secondary'>{secondaryData}</div>}
      </div>
      <div className={cx(['fab-container', !showFab && 'fab-container--hidden'])}>
        <Button variant='primary' size='xlarge' onClick={goToEditMode}>
          <IoPencil /> Edit
        </Button>
      </div>
    </div>
  );
}

interface SubscriptionStatusProps {
  event: ExtendedEntry<OntimeEvent> & { endedAt: MaybeNumber; expectedStart: number };
}

function SubscriptionStatus({ event }: SubscriptionStatusProps) {
  const { status, statusDisplay, timeDisplay } = useSubscriptionDisplayData(event);
  const { message } = useCountdownSocket();

  const showMessage = message.timer.visible && message.timer.text;

  return (
    <>
      <div className='event__status'>{statusDisplay}</div>
      {showMessage && !message.timer.overlay ? (
        <FitText
          mode='multi'
          min={16}
          max={256}
          className={cx(['event__timer', message.timer.blink && 'blink'])}
        >
          {message.timer.text}
        </FitText>
      ) : (
        <>
          {status === 'done' ? (
            <SuperscriptTime className='event__timer' time={timeDisplay} />
          ) : (
            <div className='event__timer'>{timeDisplay}</div>
          )}
          {showMessage && message.timer.overlay && (
            <div
              className='event__timer'
              style={{
                height: 'auto',
                minHeight: '0',
                flex: '0 0 20%',
                marginTop: '10px',
                color: 'var(--color-text-primary)',
              }}
            >
              <FitText
                mode='multi'
                min={16}
                max={256}
                className={cx(['message', message.timer.blink && 'blink'])}
              >
                {message.timer.text}
              </FitText>
            </div>
          )}
        </>
      )}
    </>
  );
}
