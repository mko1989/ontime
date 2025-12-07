import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CustomField } from 'ontime-types';
import { checkRegex, customFieldLabelToKey } from 'ontime-utils';

import { maybeAxiosError } from '../../../../../common/api/utils';
import Checkbox from '../../../../../common/components/checkbox/Checkbox';
import Button from '../../../../../common/components/buttons/Button';
import Info from '../../../../../common/components/info/Info';
import SwatchSelect from '../../../../../common/components/input/colour-input/SwatchSelect';
import Input from '../../../../../common/components/input/input/Input';
import Select from '../../../../../common/components/select/Select';
import RadioGroup from '../../../../../common/components/radio-group/RadioGroup';
import useCustomFields from '../../../../../common/hooks-query/useCustomFields';
import { preventEscape } from '../../../../../common/utils/keyEvent';
import * as Panel from '../../../panel-utils/PanelUtils';

import style from '../ManagePanel.module.scss';

interface CustomFieldsFormProps {
  onSubmit: (field: CustomField) => Promise<void>;
  onCancel: () => void;
  initialColour?: string;
  initialLabel?: string;
  initialKey?: string;
  initialIsTTS?: boolean;
  initialTtsThreshold?: number;
  initialTtsVoice?: string;
}

type CustomFieldFormData = CustomField & { key: string };

export default function CustomFieldForm({
  onSubmit,
  onCancel,
  initialColour,
  initialLabel,
  initialKey,
  initialIsTTS,
  initialTtsThreshold,
  initialTtsVoice,
}: CustomFieldsFormProps) {
  const { data } = useCustomFields();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window.speechSynthesis === 'undefined') return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

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
      isTTS: initialIsTTS || false,
      ttsThreshold: initialTtsThreshold || 10,
      ttsVoice: initialTtsVoice || '',
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const setupSubmit = async (values: CustomFieldFormData) => {
    const { type, label, colour, isTTS, ttsThreshold, ttsVoice } = values;
    const newField: CustomField = {
      type,
      colour,
      label,
      isTTS,
      ttsThreshold,
      ttsVoice,
    };
    try {
      await onSubmit(newField);
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

      <label>
        <Panel.Description>Enable Voice Readout</Panel.Description>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px' }}>
          <Checkbox
            checked={watch('isTTS')}
            onCheckedChange={(c) => setValue('isTTS', !!c, { shouldDirty: true })}
          />
          <span style={{ fontSize: '0.9rem' }}>Enable</span>
        </div>
      </label>

      {watch('isTTS') && (
        <div className={style.twoCols}>
          <label>
            <Panel.Description>Readout Threshold (seconds)</Panel.Description>
            <Input
              type='number'
              {...register('ttsThreshold', { valueAsNumber: true, min: 1 })}
              fluid
            />
          </label>
        </div>
      )}

      {watch('isTTS') && (
        <label>
          <Panel.Description>Voice</Panel.Description>
          <Select
            value={watch('ttsVoice')}
            onValueChange={(value) => setValue('ttsVoice', value, { shouldDirty: true })}
            options={[
              { value: '', label: 'Default' },
              ...voices.map((voice) => ({
                value: voice.name,
                label: `${voice.name} (${voice.lang})`,
              })),
            ]}
            fluid
          />
        </label>
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
