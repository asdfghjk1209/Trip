import { Suspense } from 'react';
import AppearanceContent from './AppearanceClient';

export const dynamic = 'force-dynamic';

export default function AppearancePage() {
    return (
        <Suspense fallback={<div>Loading settings...</div>}>
            <AppearanceContent />
        </Suspense>
    );
}
