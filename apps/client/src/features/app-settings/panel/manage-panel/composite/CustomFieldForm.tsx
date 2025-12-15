import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CustomField } from 'ontime-types';
import { checkRegex, customFieldLabelToKey } from 'ontime-utils';

import { maybeAxiosError } from '../../../../../common/api/utils';
import Button from '../../../../../common/components/buttons/Button';
import Info from '../../../../../common/components/info/Info';
import SwatchSelect from '../../../../../common/components/input/colour-input/SwatchSelect';
import Input from '../../../../../common/components/input/input/Input';
import RadioGroup from '../../../../../common/components/radio-group/RadioGroup';
import Select from '../../../../../common/components/select/Select';
import Switch from '../../../../../common/components/switch/Switch';
import useCustomFields from '../../../../../common/hooks-query/useCustomFields';
import { useVoices } from '../../../../../common/hooks/useVoices';
import { preventEscape } from '../../../../../common/utils/keyEvent';
import * as Panel from '../../../panel-utils/PanelUtils';

import style from '../ManagePanel.module.scss';

interface CustomFieldsFormProps {
  onSubmit: (field: CustomField) => Promise<void>;
  onCancel: () => void;
  initialColour?: string;
  initialLabel?: string;
  initialKey?: string;
  initialTTS?: CustomField['tts'];
}

type CustomFieldFormData = CustomField & { key: string };

export default function CustomFieldForm({
  onSubmit,
  onCancel,
  initialColour,
  initialLabel,
  initialKey,
  initialTTS,
}: CustomFieldsFormProps) {
  const { data } = useCustomFields();
  const voices = useVoices();

  // we use this to force an update
  const [_, setColour] = useState(initialColour || '');

  const {
    handleSubmit,
    register,
    setFocus,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<CustomFieldFormData>({
    defaultValues: {
      type: 'text',
      label: initialLabel || '',
      colour: initialColour || '',
      tts: initialTTS || {
        enabled: false,
        threshold: 10,
        voice: '',
        language: 'en-US',
      },
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const fieldType = watch('type');
  const ttsEnabled = watch('tts.enabled') ?? false;
  const ttsVoice = watch('tts.voice') ?? '';
  const ttsLanguage = watch('tts.language') ?? 'en-US';

  // Filter voices by language
  const voicesByLanguage = useMemo(() => {
    const langCode = ttsLanguage.split('-')[0];
    return voices.filter((voice) => voice.lang.startsWith(langCode));
  }, [voices, ttsLanguage]);

  // Voice options
  const voiceOptions = useMemo(() => {
    const options = voicesByLanguage.map((voice) => ({
      value: voice.voiceURI,
      label: `${voice.name} (${voice.lang})`,
    }));
    return options;
  }, [voicesByLanguage]);

  // Ensure tts object exists
  useEffect(() => {
    if (!watch('tts')) {
      setValue('tts', {
        enabled: false,
        threshold: 10,
        voice: '',
        language: 'en-US',
      });
    }
  }, [setValue, watch]);

  const setupSubmit = async (values: CustomFieldFormData) => {
    const { type, label, colour, tts } = values;
    const newField: Partial<CustomField> = {
      type,
      colour,
      label,
    };
    
    // Only include TTS if it's enabled, otherwise explicitly set to undefined to remove it
    if (tts?.enabled) {
      newField.tts = tts;
    } else {
      // Explicitly set to undefined so server knows to remove it
      newField.tts = undefined;
    }
    
    try {
      await onSubmit(newField as CustomField);
    } catch (error) {
      setError('root', { type: 'custom', message: maybeAxiosError(error) });
    }
  };

  // give initial focus to the label
  useEffect(() => {
    setFocus('label');
  }, [setFocus]);

  const handleSelectColour = (colour: string) => {
    setColour(colour);
    setValue('colour', colour, { shouldDirty: true });
  };

  const colour = getValues('colour');
  const canSubmit = isDirty && isValid;
  // if initial values are given, we can assume we are in edit mode
  const isEditMode = initialKey !== undefined;

  return (
    <Panel.Indent as='form' onSubmit={handleSubmit(setupSubmit)} onKeyDown={(event) => preventEscape(event, onCancel)}>
      <Info>
        Please note that images can quickly deteriorate your app&apos;s performance.
        <br />
        Prefer using small, and compressed images.
      </Info>
      <div>
        <Panel.Description>Type</Panel.Description>
        <RadioGroup
          orientation='horizontal'
          disabled={isEditMode}
          onValueChange={(value) => setValue('type', value, { shouldDirty: true })}
          value={watch('type')}
          items={[
            { value: 'text', label: 'Text' },
            { value: 'image', label: 'Image' },
          ]}
        />
      </div>
      <div className={style.twoCols}>
        <label>
          <Panel.Description>Label (only alphanumeric characters are allowed)</Panel.Description>
          {errors.label && <Panel.Error>{errors.label.message}</Panel.Error>}
          <Input
            {...register('label', {
              required: { value: true, message: 'Required field' },
              onChange: () => setValue('key', customFieldLabelToKey(getValues('label')) ?? 'N/A'),
              validate: (value) => {
                if (value.trim().length === 0) return 'Required field';
                if (!checkRegex.isAlphanumericWithSpace(value))
                  return 'Only alphanumeric characters and space are allowed';
                if (!isEditMode) {
                  if (isEditMode && Object.keys(data).includes(value)) return 'Custom fields must be unique';
                }
                return true;
              },
            })}
            fluid
          />
        </label>

        <label>
          <Panel.Description>Key (use in Integrations and API)</Panel.Description>
          <Input {...register('key')} variant='ghosted' readOnly fluid />
        </label>
      </div>
      <label>
        <Panel.Description>Colour</Panel.Description>
        <SwatchSelect name='colour' value={colour} handleChange={(_field, value) => handleSelectColour(value)} />
      </label>
      {fieldType === 'text' && (
        <>
          <Panel.Divider />
          <Panel.Section>
            <Panel.SubHeader>Text-to-Speech (TTS) Settings</Panel.SubHeader>
            <Info>Read aloud time values (hh:mm:ss or mm:ss) from this field when they fall below the threshold</Info>
            <Panel.ListGroup>
              <Panel.ListItem>
                <Panel.Field
                  title='Enable TTS'
                  description='Read aloud time values from this custom field in the cuesheet view'
                />
                <Switch
                  checked={ttsEnabled}
                  onCheckedChange={(checked) => {
                    setValue('tts.enabled', checked, { shouldDirty: true });
                    if (checked && !watch('tts')) {
                      setValue('tts', {
                        enabled: true,
                        threshold: 10,
                        voice: '',
                        language: 'en-US',
                      });
                    }
                  }}
                />
              </Panel.ListItem>
              {ttsEnabled && (
                <>
                  <Panel.ListItem>
                    <Panel.Field
                      title='Threshold (seconds)'
                      description='Only read aloud times that are below this threshold (in seconds)'
                      error={errors.tts?.threshold?.message}
                    />
                    <Input
                      id='tts.threshold'
                      type='number'
                      style={{ width: '100px' }}
                      {...register('tts.threshold', {
                        required: { value: true, message: 'Required field' },
                        min: { value: 0, message: 'Threshold must be 0 or greater' },
                        valueAsNumber: true,
                      })}
                    />
                  </Panel.ListItem>
                  <Panel.ListItem>
                    <Panel.Field
                      title='TTS Language'
                      description='Language code for text-to-speech (e.g., en-US, en-GB, fr-FR)'
                      error={errors.tts?.language?.message}
                    />
                    <Input
                      id='tts.language'
                      type='text'
                      style={{ width: '150px' }}
                      placeholder='en-US'
                      {...register('tts.language', {
                        required: { value: true, message: 'Required field' },
                      })}
                    />
                  </Panel.ListItem>
                  <Panel.ListItem>
                    <Panel.Field
                      title='Voice'
                      description='Select a voice for text-to-speech (filtered by language)'
                      error={errors.tts?.voice?.message}
                    />
                    <Select
                      value={ttsVoice}
                      onValueChange={(value) => setValue('tts.voice', value, { shouldDirty: true })}
                      placeholder={voiceOptions.length === 0 ? 'No voices available' : 'Select a voice'}
                      options={voiceOptions}
                    />
                  </Panel.ListItem>
                </>
              )}
            </Panel.ListGroup>
          </Panel.Section>
        </>
      )}
      {errors.root && <Panel.Error>{errors.root.message}</Panel.Error>}
      <Panel.InlineElements relation='inner' align='end'>
        <Button variant='ghosted' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' variant='primary' disabled={!canSubmit} loading={isSubmitting}>
          Save
        </Button>
      </Panel.InlineElements>
    </Panel.Indent>
  );
}
