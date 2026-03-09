import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface NotificationData {
    [key: string]: string | number | boolean;
    tenantId: string;
    type: 'RENT_DUE' | 'CHECKOUT';
}

const NotificationService = {
    /**
     * Request permissions and setup Android channel
     */
    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        // Handle Expo Go limitations for SDK 53+
        if (Constants.appOwnership === 'expo') {
            console.warn('Notification permissions check skipped in Expo Go to avoid SDK 53+ warnings. Use a development build for full features.');
            return true;
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return false;
            }
            return true;
        } else {
            return false;
        }
    },

    /**
     * Schedule a recurring rent reminder for monthly tenants
     * Triggers 3 days before the anniversary of their move-in date
     */
    async scheduleMonthlyRentReminder(tenantId: string, tenantName: string, moveInDate: string) {
        const moveIn = new Date(moveInDate);
        if (isNaN(moveIn.getTime())) return null;

        const dueDay = moveIn.getDate();
        let reminderDay = dueDay - 3;

        // Handle cases where reminderDay becomes negative or 0
        if (reminderDay <= 0) {
            // If they moved in on 1st, 2nd, or 3rd, the reminder should be end of previous month
            // But for simplicity in a "day of month" trigger, we'll just set it to 28th if it's <= 0
            reminderDay = 28 + reminderDay;
        }

        const identifier = `rent_${tenantId}`;
        await this.cancelNotification(identifier);

        const data: NotificationData = { tenantId, type: 'RENT_DUE' };

        const now = new Date();
        const nextDate = new Date();

        // Ensure month calculation respects end-of-month bounds
        nextDate.setDate(1);
        nextDate.setMonth(now.getMonth());
        nextDate.setDate(reminderDay);
        nextDate.setHours(10, 0, 0, 0);

        if (nextDate.getTime() <= now.getTime()) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        // Use standard date trigger to avoid Android calendar trigger limitations
        return await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Rent Due Soon 🏠',
                body: `Friendly reminder: Rent for ${tenantName} is due in 3 days.`,
                data,
            },
            trigger: {
                date: nextDate,
                channelId: 'default',
            },
            identifier,
        });
    },

    /**
     * Schedule a checkout reminder 2 days before checkout
     */
    async scheduleCheckoutReminder(tenantId: string, tenantName: string, checkoutDate: string) {
        if (!checkoutDate) return null;

        const checkout = new Date(checkoutDate);
        if (isNaN(checkout.getTime())) return null;

        const triggerDate = new Date(checkout);
        triggerDate.setDate(checkout.getDate() - 2);
        triggerDate.setHours(11, 0, 0, 0);

        if (triggerDate.getTime() <= Date.now()) return null;

        const identifier = `checkout_${tenantId}`;
        await this.cancelNotification(identifier);

        const data: NotificationData = { tenantId, type: 'CHECKOUT' };

        return await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Checkout Reminder 📦',
                body: `${tenantName} is scheduled to checkout in 2 days (${checkout.toLocaleDateString()}).`,
                data,
            },
            trigger: {
                date: triggerDate,
                channelId: 'default',
            },
            identifier,
        });
    },

    /**
     * Cancel specific notification
     */
    async cancelNotification(identifier: string) {
        try {
            await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch (error) {
            // Silently fail if not found
        }
    },

    /**
     * Cancel all notifications for a specific tenant
     */
    async cancelAllForTenant(tenantId: string) {
        await Promise.all([
            this.cancelNotification(`rent_${tenantId}`),
            this.cancelNotification(`checkout_${tenantId}`),
        ]);
    },

    /**
     * Clear all scheduled notifications
     */
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
};

export default NotificationService;
