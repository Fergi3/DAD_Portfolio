import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  View,
  Text,
  StyleSheet,
} from 'react-native';

import { getStepImage } from '../utils/getStepImage';
import theme from '../constants/theme';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_DELAY = 280;

type Point = { x: number; y: number };
type ViewerSize = { width: number; height: number };

type Props = {
  imagePath: string;
  accessibilityLabel?: string;
  height?: number;
};

export default function ExpandableRepairImage({
  imagePath,
  accessibilityLabel = 'Tap to enlarge repair diagram',
  height = 300,
}: Props) {
  const [visible, setVisible] = useState(false);
  const imageSource = getStepImage(imagePath);
  const scale = useRef(new Animated.Value(MIN_SCALE)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(MIN_SCALE);
  const translation = useRef<Point>({ x: 0, y: 0 });
  const gestureStartScale = useRef(MIN_SCALE);
  const gestureStartTranslation = useRef<Point>({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const pinchStartCenter = useRef<Point>({ x: 0, y: 0 });
  const panStartPoint = useRef<Point | null>(null);
  const viewerSize = useRef<ViewerSize>({ width: 0, height: 0 });
  const lastTapTime = useRef(0);
  const gestureStartTime = useRef(0);
  const gestureMoved = useRef(false);

const resolvedImage = useMemo(() => {
  if (!imageSource) return null;

  if (typeof imageSource === 'object') {
    return imageSource;
  }

  return null;
}, [imageSource]);

  function getTouchCenter(touches: readonly any[]): Point {
    const first = touches[0];
    const second = touches[1] || first;
    return {
      x: (first.pageX + second.pageX) / 2,
      y: (first.pageY + second.pageY) / 2,
    };
  }

  function getTouchDistance(touches: readonly any[]) {
    if (touches.length < 2) return 0;
    const deltaX = touches[0].pageX - touches[1].pageX;
    const deltaY = touches[0].pageY - touches[1].pageY;
    return Math.hypot(deltaX, deltaY);
  }

  function getTranslationBounds(nextScale: number): Point {
    const { width: viewportWidth, height: viewportHeight } = viewerSize.current;
    if (!viewportWidth || !viewportHeight || !resolvedImage?.width || !resolvedImage?.height) {
      return { x: 0, y: 0 };
    }

    const containRatio = Math.min(
      viewportWidth / resolvedImage.width,
      viewportHeight / resolvedImage.height,
    );
    const renderedWidth = resolvedImage.width * containRatio;
    const renderedHeight = resolvedImage.height * containRatio;

    return {
      x: Math.max(0, (renderedWidth * nextScale - viewportWidth) / 2),
      y: Math.max(0, (renderedHeight * nextScale - viewportHeight) / 2),
    };
  }

  function clampTranslation(point: Point, nextScale = scaleValue.current): Point {
    if (nextScale <= MIN_SCALE) return { x: 0, y: 0 };
    const bounds = getTranslationBounds(nextScale);
    return {
      x: Math.max(-bounds.x, Math.min(bounds.x, point.x)),
      y: Math.max(-bounds.y, Math.min(bounds.y, point.y)),
    };
  }

  function setTransform(nextScale: number, nextTranslation: Point) {
    const boundedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    const boundedTranslation = clampTranslation(nextTranslation, boundedScale);
    scaleValue.current = boundedScale;
    translation.current = boundedTranslation;
    scale.setValue(boundedScale);
    translateX.setValue(boundedTranslation.x);
    translateY.setValue(boundedTranslation.y);
  }

  function animateTransform(nextScale: number, nextTranslation: Point) {
    const boundedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    const boundedTranslation = clampTranslation(nextTranslation, boundedScale);
    scaleValue.current = boundedScale;
    translation.current = boundedTranslation;
    Animated.parallel([
      Animated.spring(scale, { toValue: boundedScale, useNativeDriver: true, overshootClamping: true }),
      Animated.spring(translateX, { toValue: boundedTranslation.x, useNativeDriver: true, overshootClamping: true }),
      Animated.spring(translateY, { toValue: boundedTranslation.y, useNativeDriver: true, overshootClamping: true }),
    ]).start();
  }

  function resetTransform(animated = false) {
    scale.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();
    if (animated) {
      animateTransform(MIN_SCALE, { x: 0, y: 0 });
      return;
    }
    setTransform(MIN_SCALE, { x: 0, y: 0 });
  }

  function handleOpen() {
    resetTransform();
    setVisible(true);
  }

  function handleClose() {
    resetTransform();
    setVisible(false);
  }

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event) => {
      gestureStartTime.current = Date.now();
      gestureMoved.current = false;
      const touches = event.nativeEvent.touches;
      gestureStartScale.current = scaleValue.current;
      gestureStartTranslation.current = translation.current;
      panStartPoint.current = touches.length === 1
        ? { x: touches[0].pageX, y: touches[0].pageY }
        : null;

      if (touches.length >= 2) {
        pinchStartDistance.current = getTouchDistance(touches);
        pinchStartCenter.current = getTouchCenter(touches);
      }
    },
    onPanResponderMove: (event, gestureState) => {
      const touches = event.nativeEvent.touches;
      if (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6) {
        gestureMoved.current = true;
      }
      if (touches.length >= 2) {
        const distance = getTouchDistance(touches);
        const center = getTouchCenter(touches);
        if (!pinchStartDistance.current) {
          pinchStartDistance.current = distance;
          pinchStartCenter.current = center;
          gestureStartScale.current = scaleValue.current;
          gestureStartTranslation.current = translation.current;
        }

        const nextScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, gestureStartScale.current * (distance / pinchStartDistance.current)),
        );
        const scaleRatio = nextScale / gestureStartScale.current;
        const viewportCenter = {
          x: viewerSize.current.width / 2,
          y: viewerSize.current.height / 2,
        };
        const nextTranslation = {
          x: center.x - viewportCenter.x
            - scaleRatio * (pinchStartCenter.current.x - viewportCenter.x - gestureStartTranslation.current.x),
          y: center.y - viewportCenter.y
            - scaleRatio * (pinchStartCenter.current.y - viewportCenter.y - gestureStartTranslation.current.y),
        };
        gestureMoved.current = true;
        panStartPoint.current = null;
        setTransform(nextScale, nextTranslation);
        return;
      }

      pinchStartDistance.current = 0;
      if (touches.length === 1 && scaleValue.current > MIN_SCALE) {
        const point = { x: touches[0].pageX, y: touches[0].pageY };
        if (!panStartPoint.current) {
          panStartPoint.current = point;
          gestureStartTranslation.current = translation.current;
        }
        const nextTranslation = {
          x: gestureStartTranslation.current.x + point.x - panStartPoint.current.x,
          y: gestureStartTranslation.current.y + point.y - panStartPoint.current.y,
        };
        gestureMoved.current = true;
        setTransform(scaleValue.current, nextTranslation);
      }
    },
    onPanResponderRelease: () => {
      pinchStartDistance.current = 0;
      panStartPoint.current = null;
      if (!gestureMoved.current && Date.now() - gestureStartTime.current < 250) {
        handleViewerTap();
        return;
      }
      animateTransform(scaleValue.current, translation.current);
    },
    onPanResponderTerminate: () => {
      pinchStartDistance.current = 0;
      panStartPoint.current = null;
      animateTransform(scaleValue.current, translation.current);
    },
  }), [resolvedImage?.height, resolvedImage?.width]);

  function handleViewerTap() {
    const now = Date.now();
    if (now - lastTapTime.current <= DOUBLE_TAP_DELAY) {
      const shouldReset = scaleValue.current > MIN_SCALE;
      animateTransform(shouldReset ? MIN_SCALE : DOUBLE_TAP_SCALE, { x: 0, y: 0 });
      lastTapTime.current = 0;
      return;
    }
    lastTapTime.current = now;
  }

  if (__DEV__) {
  }

  if (!imageSource) return null;

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={styles.previewWrap}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel}
      >
        <Image
          source={imageSource}
          style={[styles.previewImage, { height }]}
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.tapHint}>Tap to enlarge</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View
            style={styles.zoomViewport}
            onLayout={(event) => {
              viewerSize.current = event.nativeEvent.layout;
              const boundedTranslation = clampTranslation(translation.current);
              setTransform(scaleValue.current, boundedTranslation);
            }}
            {...panResponder.panHandlers}
            accessibilityRole="image"
            accessibilityLabel="Enlarged repair diagram. Pinch to zoom and drag to pan."
          >
            <Animated.Image
              source={imageSource}
              style={[
                styles.fullImage,
                { transform: [{ translateX }, { translateY }, { scale }] },
              ]}
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.zoomHint}>Pinch to zoom</Text>
          </View>

          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close enlarged image"
          >
            <Text style={styles.closeText}>x</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  previewImage: {
    width: '100%',
    resizeMode: 'contain',
    borderRadius: theme.radius.md,
  },
  tapHint: {
    textAlign: 'center',
    color: theme.colors.subtext,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.82,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  zoomViewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  zoomHint: {
    position: 'absolute',
    bottom: theme.spacing.xxl,
    color: 'rgba(255,255,255,0.78)',
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.xl * 2,
    right: theme.spacing.lg,
    zIndex: 10,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: theme.colors.white,
    fontSize: 40,
    fontWeight: '600',
  },
});
