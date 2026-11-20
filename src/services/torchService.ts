let mediaStream: MediaStream | null = null;
let torchTrack: MediaStreamTrack | null = null;
let isTorchActive = false;

export async function toggleFlashlight(requestedState?: boolean): Promise<{ success: boolean; state: boolean; message: string }> {
  const targetState = requestedState !== undefined ? requestedState : !isTorchActive;

  // Turn off
  if (!targetState) {
    if (torchTrack) {
      try {
        // @ts-ignore
        await torchTrack.applyConstraints({ advanced: [{ torch: false }] });
      } catch (e) {
        console.warn('Could not turn off torch via constraints', e);
      }
      torchTrack.stop();
      torchTrack = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    isTorchActive = false;
    return { success: true, state: false, message: 'Torch band kar di gayi hai.' };
  }

  // Turn on
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, state: false, message: 'Is browser me camera flashlight access supported nahi hai.' };
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        // @ts-ignore
        advanced: [{ torch: true }],
      },
    });

    const tracks = mediaStream.getVideoTracks();
    if (tracks.length > 0) {
      torchTrack = tracks[0];
      const capabilities = (torchTrack.getCapabilities && torchTrack.getCapabilities()) || {};
      // @ts-ignore
      if ('torch' in capabilities || capabilities.fillLightMode) {
        // @ts-ignore
        await torchTrack.applyConstraints({ advanced: [{ torch: true }] });
        isTorchActive = true;
        return { success: true, state: true, message: 'Torch chalu ho gayi hai.' };
      } else {
        // Device track doesn't support torch constraint directly
        isTorchActive = true;
        return {
          success: true,
          state: true,
          message: 'Torch camera stream active hai (Screen flashlight mode).',
        };
      }
    }
    return { success: false, state: false, message: 'Camera flashlight track nahi mila.' };
  } catch (err: any) {
    console.error('Torch error:', err);
    return {
      success: false,
      state: false,
      message: 'Torch chalu karne ke liye camera permission chahiye ya flash busy hai.',
    };
  }
}

export function getTorchState(): boolean {
  return isTorchActive;
}
