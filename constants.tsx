import React from 'react';
import { PreCodedGpt, UserRole } from './types';
import { Icon } from './components/Icon';

export const PRE_CODED_GPTS: PreCodedGpt[] = [
  {
    id: 'homeopathy-analysis',
    title: 'Repertory Analysis',
    description: 'Input patient symptoms, modalities, and constitution to receive a structured list of potential remedies with their keynotes and suggested potencies.',
    icon: <Icon name="diagnosis" />,
    roles: [UserRole.DOCTOR],
  },
];