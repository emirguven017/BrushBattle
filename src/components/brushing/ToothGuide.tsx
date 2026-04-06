import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, AppState, Platform } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { ZoneIndex } from '../../utils/brushingZones';

interface ToothGuideProps {
  activeZone: ZoneIndex;
}

const zoneVideos = [
  require('../../../assets/videos/sagUst.mp4'),
  require('../../../assets/videos/sagAlt.mp4'),
  require('../../../assets/videos/solUst.mp4'),
  require('../../../assets/videos/solAlt.mp4'),
];

export const ToothGuide: React.FC<ToothGuideProps> = ({ activeZone }) => {
  const useStaticGuide = Platform.OS === 'ios' && !__DEV__;
  const appStateRef = useRef(AppState.currentState);
  const player = useVideoPlayer(zoneVideos[0], (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    if (useStaticGuide) return;
    player.replace(zoneVideos[activeZone], true);
    player.currentTime = 0;
    player.play();
  }, [activeZone, player, useStaticGuide]);

  useEffect(() => {
    if (useStaticGuide) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasBackground = /inactive|background/.test(appStateRef.current);
      if (wasBackground && nextState === 'active') {
        // Some devices pause/stall video playback after app resume.
        player.replace(zoneVideos[activeZone], true);
        player.currentTime = 0;
        player.play();
      }
      appStateRef.current = nextState;
    });

    return () => {
      sub.remove();
    };
  }, [activeZone, player, useStaticGuide]);

  if (useStaticGuide) {
    return (
      <View style={styles.container}>
        <View style={styles.staticGuide} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: 260,
    marginBottom: 8,
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  staticGuide: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8F5E9',
  },
});
