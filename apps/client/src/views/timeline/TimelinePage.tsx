import { useMemo } from 'react';
import { OntimeView } from 'ontime-types';

import EmptyPage from '../../common/components/state/EmptyPage';
import ViewLogo from '../../common/components/view-logo/ViewLogo';
import ViewParamsEditor from '../../common/components/view-params-editor/ViewParamsEditor';
import { FitText } from '../../common/components/fit-text/FitText';
import { cx } from '../../common/utils/styleUtils';
import { useClock, useSelectedEventId, useTimerMessageInputWithSettings, useTimerViewControl } from '../../common/hooks/useSocket';
import { useWindowTitle } from '../../common/hooks/useWindowTitle';
import { formatTime, getDefaultFormat } from '../../common/utils/time';
import SuperscriptTime from '../../features/viewers/common/superscript-time/SuperscriptTime';
import { useTranslation } from '../../translation/TranslationProvider';
import Loader from '../common/loader/Loader';

import Timeline from './Timeline';
import { getTimelineOptions } from './timeline.options';
import { getUpcomingEvents, useScopedRundown } from './timeline.utils';
import TimelineSections from './TimelineSections';
import { TimelineData, useTimelineData } from './useTimelineData';

import './TimelinePage.scss';

export default function TimelinePageLoader() {
  const { data, status } = useTimelineData();

  useWindowTitle('Timeline');

  if (status === 'pending') {
    return <Loader />;
  }

  if (status === 'error') {
    return <EmptyPage text='There was an error fetching data, please refresh the page.' />;
  }

  return <TimelinePage {...data} />;
}

function TimelinePage({ events, projectData, settings }: TimelineData) {
  const { selectedEventId } = useSelectedEventId();
  const { text, visible, overlay } = useTimerMessageInputWithSettings();
  const { blink } = useTimerViewControl();

  // holds copy of the rundown with only relevant events
  const { scopedRundown, firstStart, totalDuration } = useScopedRundown(events, selectedEventId);

  // gather card options
  const { now, next, followedBy } = useMemo(() => {
    return getUpcomingEvents(scopedRundown, selectedEventId);
  }, [scopedRundown, selectedEventId]);

  // populate options
  const defaultFormat = getDefaultFormat(settings?.timeFormat);
  const progressOptions = useMemo(() => getTimelineOptions(defaultFormat), [defaultFormat]);

  return (
    <div className='timeline' data-testid='timeline-view'>
      <ViewParamsEditor target={OntimeView.Timeline} viewOptions={progressOptions} />
      <div className='project-header'>
        {projectData?.logo && <ViewLogo name={projectData.logo} className='logo' />}
        <div className='title'>{projectData.title}</div>
        <TimelineClock />
      </div>

      {visible && text && !overlay ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <FitText mode='multi' min={32} max={256} className={cx(['message', blink && 'blink'])}>
            {text}
          </FitText>
        </div>
      ) : (
        <>
          <TimelineSections now={now} next={next} followedBy={followedBy} />

          {visible && text && overlay && (
            <div
              style={{
                width: '100%',
                height: '20%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-background-paper)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <FitText
                mode='multi'
                min={32}
                max={256}
                className={cx(['message', blink && 'blink'])}
                style={{ width: '100%', textAlign: 'center', color: 'var(--color-text-primary)' }}
              >
                {text}
              </FitText>
            </div>
          )}

          <Timeline
            firstStart={firstStart}
            rundown={scopedRundown}
            selectedEventId={selectedEventId}
            totalDuration={totalDuration}
          />
        </>
      )}
    </div>
  );
}

function TimelineClock() {
  const { getLocalizedString } = useTranslation();
  const { clock } = useClock();

  // gather timer data
  const formattedClock = formatTime(clock);

  return (
    <div className='clock-container'>
      <div className='label'>{getLocalizedString('common.time_now')}</div>
      <SuperscriptTime time={formattedClock} className='time' />
    </div>
  );
}
