import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * A hook that triggers a callback when the app returns to the foreground.
 * @param onRefresh Callback to be called when the app becomes active.
 * @param isFocused Optional boolean to only trigger if the screen is currently focused.
 */
export const useRefreshOnForeground = (onRefresh: () => void, isFocused: boolean = true) => {
    const appState = useRef(AppState.currentState);
    const onRefreshRef = useRef(onRefresh);

    // Keep the callback ref up to date
    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // Highly important: Only refresh if the screen is focused
                if (isFocused) {
                    onRefreshRef.current();
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [isFocused]);
};
