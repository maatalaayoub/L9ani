"use client";

import { useAuth } from '@/context/AuthContext';
import TermsDialog from './TermsDialog';

export default function TermsDialogWrapper() {
    const { showTermsDialog, handleTermsAccepted } = useAuth();

    return (
        <TermsDialog 
            isOpen={showTermsDialog} 
            onAccept={handleTermsAccepted} 
        />
    );
}
