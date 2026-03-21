import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const AlertNotificationsContext = createContext(null);
const POLL_INTERVAL_MS = 5000;

const playNotificationSound = () => {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      660,
      audioContext.currentTime + 0.18,
    );

    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.14,
      audioContext.currentTime + 0.02,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.35,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.35);
    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch (error) {
    console.error("Failed to play alert notification sound:", error);
  }
};

export const AlertNotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [configuredAlerts, setConfiguredAlerts] = useState([]);
  const [triggeredFeed, setTriggeredFeed] = useState([]);
  const [unreadTriggeredCount, setUnreadTriggeredCount] = useState(0);
  const [latestNewAlert, setLatestNewAlert] = useState(null);
  const seenAlertIdsRef = useRef(new Set());
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    seenAlertIdsRef.current = new Set();
    hasHydratedRef.current = false;
    setConfiguredAlerts([]);
    setTriggeredFeed([]);
    setUnreadTriggeredCount(0);
    setLatestNewAlert(null);
  }, [user?.username]);

  useEffect(() => {
    if (!user || location.pathname !== "/alerts") {
      return;
    }

    const seenIds = new Set(seenAlertIdsRef.current);
    triggeredFeed.forEach(alert => {
      seenIds.add(String(alert.alert_id));
    });
    seenAlertIdsRef.current = seenIds;
    setUnreadTriggeredCount(0);
    setLatestNewAlert(null);
  }, [location.pathname, triggeredFeed, user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isMounted = true;

    const fetchAlerts = async () => {
      try {
        const response = await api.get("/alerts");
        if (!isMounted) {
          return;
        }

        const nextConfiguredAlerts = response.data.configured_alerts || [];
        const nextTriggeredFeed = response.data.triggered_feed || [];

        setConfiguredAlerts(nextConfiguredAlerts);
        setTriggeredFeed(nextTriggeredFeed);

        if (!hasHydratedRef.current) {
          seenAlertIdsRef.current = new Set(
            nextTriggeredFeed.map(alert => String(alert.alert_id)),
          );
          hasHydratedRef.current = true;
          return;
        }

        const newAlerts = nextTriggeredFeed.filter(
          alert => !seenAlertIdsRef.current.has(String(alert.alert_id)),
        );

        if (newAlerts.length > 0) {
          const nextSeen = new Set(seenAlertIdsRef.current);
          newAlerts.forEach(alert => {
            nextSeen.add(String(alert.alert_id));
          });
          seenAlertIdsRef.current = nextSeen;

          if (location.pathname !== "/alerts") {
            setUnreadTriggeredCount(prev => prev + newAlerts.length);
            setLatestNewAlert(newAlerts[0]);
            playNotificationSound();
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to fetch shared alert notifications:", error);
        }
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname, user]);

  const markAlertsAsSeen = useCallback(() => {
    const seenIds = new Set(seenAlertIdsRef.current);
    triggeredFeed.forEach(alert => {
      seenIds.add(String(alert.alert_id));
    });
    seenAlertIdsRef.current = seenIds;
    setUnreadTriggeredCount(0);
    setLatestNewAlert(null);
  }, [triggeredFeed]);

  return (
    <AlertNotificationsContext.Provider
      value={{
        configuredAlerts,
        triggeredFeed,
        unreadTriggeredCount,
        latestNewAlert,
        markAlertsAsSeen,
      }}
    >
      {children}
    </AlertNotificationsContext.Provider>
  );
};

export const useAlertNotifications = () => useContext(AlertNotificationsContext);
