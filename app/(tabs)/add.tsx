// This screen is a placeholder — the actual add flow is a modal at /transaction/add
// Tapping the center tab button navigates there directly from the tab layout.
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AddPlaceholder() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/transaction/add');
  }, []);
  return null;
}
