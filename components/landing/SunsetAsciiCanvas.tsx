"use client";

import { useEffect, useRef } from "react";

const PRESET = {
  cellSize: 10,
  coverage: 100,
  density: 0,
  invert: false,
  brightness: 0,
  contrast: 115,
  saturation: 100,
  grayscale: 0,
  tint: "#ff3b1f",
  tintOpacity: 32,
  bgOpacity: 90,
  bloom: 45,
  vignette: 55,
  animSpeed: 100,
  animIntensity: 60,
} as const;

const AUSTRALIA_PRESET = {
  cellSize: 7,
  coverage: 90,
  tint: "#ff6b2c",
  bloom: 60,
  scanLines: 28,
  animIntensity: 60,
} as const;

const COLOR_LEVELS = 18;
const FRAME_INTERVAL = 1000 / 30;

type DotSample = {
  bucket: number;
  luminance: number;
  phase: number;
  x: number;
  y: number;
};

type AustraliaSample = {
  character: "0" | "1";
  luminance: number;
  phase: number;
  x: number;
  y: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(start: number, end: number, value: number) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

function overlayChannel(base: number, tint: number) {
  return base < 0.5
    ? 2 * base * tint
    : 1 - 2 * (1 - base) * (1 - tint);
}

function adjustedColor(value: number) {
  const brightness = PRESET.brightness / 100;
  const contrast = PRESET.contrast / 100;
  let red = clamp((value + brightness - 0.5) * contrast + 0.5);
  let green = red;
  let blue = red;

  const saturation = PRESET.saturation / 100;
  const grayscale = PRESET.grayscale / 100;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  red = luminance + (red - luminance) * saturation;
  green = luminance + (green - luminance) * saturation;
  blue = luminance + (blue - luminance) * saturation;
  red += (luminance - red) * grayscale;
  green += (luminance - green) * grayscale;
  blue += (luminance - blue) * grayscale;

  const tint = [0xff / 255, 0x3b / 255, 0x1f / 255] as const;
  const tintOpacity = PRESET.tintOpacity / 100;
  red += (overlayChannel(red, tint[0]) - red) * tintOpacity;
  green += (overlayChannel(green, tint[1]) - green) * tintOpacity;
  blue += (overlayChannel(blue, tint[2]) - blue) * tintOpacity;

  return `rgb(${Math.round(clamp(red) * 255)} ${Math.round(
    clamp(green) * 255,
  )} ${Math.round(clamp(blue) * 255)})`;
}

function coverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return {
      sx: (sourceWidth - width) / 2,
      sy: 0,
      sw: width,
      sh: sourceHeight,
    };
  }
  const height = sourceWidth / targetRatio;
  return {
    sx: 0,
    sy: (sourceHeight - height) / 2,
    sw: sourceWidth,
    sh: height,
  };
}

function fallbackLuminance(x: number, y: number) {
  const sun = Math.exp(
    -((x - 0.59) ** 2 * 95 + (y - 0.49) ** 2 * 120),
  );
  const sky = clamp(0.92 - y * 0.72);
  const horizon = y > 0.58 ? 0.18 : 0;
  const railGlow =
    Math.exp(-Math.abs(x - (0.5 + (y - 0.6) * 0.28)) * 80) * y * 0.4;
  return clamp(sky * 0.72 + sun * 0.85 + railGlow - horizon);
}

export function SunsetAsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const scene = container?.closest<HTMLElement>(".landing-hero");
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !container || !scene || !context) return;

    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const dotLayer = document.createElement("canvas");
    const dotContext = dotLayer.getContext("2d");
    const australiaCanvas = document.createElement("canvas");
    const australiaContext = australiaCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const australiaLayer = document.createElement("canvas");
    const australiaLayerContext = australiaLayer.getContext("2d");
    if (
      !sampleContext ||
      !dotContext ||
      !australiaContext ||
      !australiaLayerContext
    ) {
      return;
    }

    const image = new Image();
    image.decoding = "async";
    const australiaImage = new Image();
    australiaImage.decoding = "async";
    let imageReady = false;
    let australiaReady = false;
    let samples: DotSample[] = [];
    let australiaSamples: AustraliaSample[] = [];
    let frameId = 0;
    let resizeFrame = 0;
    let scrollFrame = 0;
    let lastFrame = -Infinity;
    let visible = true;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let scrollProgress = 0;
    let disposed = false;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const buildSamples = () => {
      const cellSize = PRESET.cellSize;
      const columns = Math.max(1, Math.ceil(width / cellSize));
      const rows = Math.max(1, Math.ceil(height / cellSize));
      sampleCanvas.width = columns;
      sampleCanvas.height = rows;
      sampleContext.clearRect(0, 0, columns, rows);

      let pixels: Uint8ClampedArray | null = null;
      if (imageReady) {
        const crop = coverCrop(
          image.naturalWidth,
          image.naturalHeight,
          columns,
          rows,
        );
        sampleContext.imageSmoothingEnabled = true;
        sampleContext.imageSmoothingQuality = "high";
        sampleContext.drawImage(
          image,
          crop.sx,
          crop.sy,
          crop.sw,
          crop.sh,
          0,
          0,
          columns,
          rows,
        );
        pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      }

      const nextSamples: DotSample[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const normalizedX = (column + 0.5) / columns;
          const normalizedY = (row + 0.5) / rows;
          const hash = (column * 31 + row * 67) % 100;
          if (hash >= PRESET.coverage) continue;

          const index = (row * columns + column) * 4;
          const luminance = pixels
            ? clamp(
                (0.2126 * pixels[index] +
                  0.7152 * pixels[index + 1] +
                  0.0722 * pixels[index + 2]) /
                  255,
              )
            : fallbackLuminance(normalizedX, normalizedY);
          const mapped = PRESET.invert ? 1 - luminance : luminance;
          nextSamples.push({
            bucket: Math.min(
              COLOR_LEVELS - 1,
              Math.floor(mapped * COLOR_LEVELS),
            ),
            luminance: mapped,
            phase: normalizedX * 2.2 + normalizedY * 1.4,
            x: column * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2,
          });
        }
      }
      samples = nextSamples;
    };

    const buildAustraliaSamples = () => {
      if (!australiaReady) {
        australiaSamples = [];
        return;
      }

      const mapWidth = Math.min(
        width < 820 ? width * 0.82 : width * 0.52,
        650,
      );
      const mapHeight = Math.min(mapWidth / 1.38, height * 0.58);
      const actualWidth = Math.min(mapWidth, mapHeight * 1.38);
      const cellSize = AUSTRALIA_PRESET.cellSize;
      const columns = Math.max(1, Math.floor(actualWidth / cellSize));
      const rows = Math.max(1, Math.floor(mapHeight / cellSize));
      australiaCanvas.width = columns;
      australiaCanvas.height = rows;
      australiaContext.clearRect(0, 0, columns, rows);
      australiaContext.imageSmoothingEnabled = true;
      australiaContext.imageSmoothingQuality = "high";

      // Crop the map from the supplied Aossie reference. The wordmark remains
      // outside this crop; only the Australia silhouette becomes part of the
      // Playground hero.
      australiaContext.drawImage(
        australiaImage,
        165,
        92,
        655,
        490,
        0,
        0,
        columns,
        rows,
      );
      const pixels = australiaContext.getImageData(
        0,
        0,
        columns,
        rows,
      ).data;
      const centerX = width < 820 ? width * 0.5 : width * 0.7;
      const centerY = height * 0.48;
      const left = centerX - (columns * cellSize) / 2;
      const top = centerY - (rows * cellSize) / 2;
      const nextSamples: AustraliaSample[] = [];

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = (row * columns + column) * 4;
          const red = pixels[index] / 255;
          const green = pixels[index + 1] / 255;
          const blue = pixels[index + 2] / 255;
          const signal = clamp(
            (green - Math.max(red, blue)) * 1.35 +
              (0.2126 * red + 0.7152 * green + 0.0722 * blue) -
              0.12,
          );
          const hash = (column * 43 + row * 71) % 100;
          if (signal < 0.15 || hash >= AUSTRALIA_PRESET.coverage) continue;
          nextSamples.push({
            character: (column + row * 3) % 2 === 0 ? "0" : "1",
            luminance: signal,
            phase: column * 0.31 + row * 0.17,
            x: left + (column + 0.5) * cellSize,
            y: top + (row + 0.5) * cellSize,
          });
        }
      }
      australiaSamples = nextSamples;
    };

    const palette = Array.from({ length: COLOR_LEVELS }, (_, index) =>
      adjustedColor(index / (COLOR_LEVELS - 1)),
    );

    const draw = (time = 0) => {
      const pulseStrength = PRESET.animIntensity / 100;
      const speed = PRESET.animSpeed / 100;
      const motionTime = time * 0.001 * speed;
      const shimmerHead = (motionTime * 0.12) % 1.5 - 0.25;
      dotContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      dotContext.clearRect(0, 0, width, height);
      dotContext.globalCompositeOperation = "source-over";

      for (let bucket = 0; bucket < COLOR_LEVELS; bucket += 1) {
        dotContext.beginPath();
        for (const sample of samples) {
          if (sample.bucket !== bucket || sample.luminance < 0.035) continue;
          const wave =
            Math.sin(time * 0.0022 * speed + sample.phase) *
            0.11 *
            pulseStrength;
          const driftStrength = 0.45 + sample.luminance * 1.35;
          const driftX =
            Math.sin(motionTime * 0.72 + sample.phase * 1.7) *
            1.75 *
            driftStrength;
          const driftY =
            Math.cos(motionTime * 0.54 + sample.phase * 1.25) *
            1.1 *
            driftStrength;
          const shimmerCoordinate =
            (sample.x / width) * 0.78 + (sample.y / height) * 0.22;
          const shimmerDistance =
            (shimmerCoordinate - shimmerHead) / 0.045;
          const shimmer = Math.exp(
            -(shimmerDistance * shimmerDistance),
          );
          const baseRadius =
            0.32 +
            Math.pow(sample.luminance, 0.88) *
              (PRESET.cellSize * 0.39 + PRESET.density * 0.01);
          const radius = Math.max(
            0.22,
            baseRadius * (1 + wave + shimmer * 0.24),
          );
          const x = sample.x + driftX;
          const y = sample.y + driftY;
          dotContext.moveTo(x + radius, y);
          dotContext.arc(x, y, radius, 0, Math.PI * 2);
        }
        dotContext.fillStyle = palette[bucket];
        dotContext.fill();
      }

      // A restrained diagonal light sweep gives the opening scene a visible
      // current without turning it into a decorative loading animation.
      dotContext.save();
      dotContext.globalCompositeOperation = "lighter";
      dotContext.beginPath();
      for (const sample of samples) {
        if (
          sample.luminance < 0.16 ||
          (Math.round(sample.x / PRESET.cellSize) +
            Math.round(sample.y / PRESET.cellSize)) %
            5 !==
            0
        ) {
          continue;
        }
        const shimmerCoordinate =
          (sample.x / width) * 0.78 + (sample.y / height) * 0.22;
        const distance = (shimmerCoordinate - shimmerHead) / 0.052;
        const shimmer = Math.exp(-(distance * distance));
        if (shimmer < 0.08) continue;
        const sparkleRadius =
          (0.5 + sample.luminance * 2.2) * shimmer;
        dotContext.moveTo(sample.x + sparkleRadius, sample.y);
        dotContext.arc(
          sample.x,
          sample.y,
          sparkleRadius,
          0,
          Math.PI * 2,
        );
      }
      dotContext.fillStyle = "rgb(255 204 184 / 0.42)";
      dotContext.fill();
      dotContext.restore();

      const mapReveal = smoothstep(0.24, 0.82, scrollProgress);
      const mapScale = 0.78 + mapReveal * 0.22;
      const mapCenterX = width < 820 ? width * 0.5 : width * 0.7;
      const mapCenterY = height * 0.48;
      australiaLayerContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      australiaLayerContext.clearRect(0, 0, width, height);
      australiaLayerContext.textAlign = "center";
      australiaLayerContext.textBaseline = "middle";
      australiaLayerContext.font = `700 ${AUSTRALIA_PRESET.cellSize * 0.92}px "Courier New", monospace`;

      for (const sample of australiaSamples) {
        const flicker =
          0.82 +
          Math.sin(time * 0.007 + sample.phase) *
            0.18 *
            (AUSTRALIA_PRESET.animIntensity / 100);
        const x = mapCenterX + (sample.x - mapCenterX) * mapScale;
        const y =
          mapCenterY +
          (sample.y - mapCenterY) * mapScale +
          (1 - mapReveal) * 34;
        australiaLayerContext.globalAlpha =
          clamp(0.44 + sample.luminance * 0.6) * flicker;
        australiaLayerContext.fillStyle =
          sample.luminance > 0.66
            ? "#ffd1c2"
            : sample.luminance > 0.4
              ? "#ff8a5f"
              : AUSTRALIA_PRESET.tint;
        australiaLayerContext.fillText(sample.character, x, y);
      }
      australiaLayerContext.globalAlpha = 1;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalAlpha = PRESET.bgOpacity / 100;
      context.fillStyle = "#0c0504";
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
      context.setTransform(1, 0, 0, 1, 0, 0);

      const sunsetOpacity = 1 - smoothstep(0.12, 0.7, scrollProgress);
      const sunsetScale = 1 + scrollProgress * 0.1;
      const sunsetWidth = dotLayer.width * sunsetScale;
      const sunsetHeight = dotLayer.height * sunsetScale;
      const sunsetX = (dotLayer.width - sunsetWidth) / 2;
      const sunsetY =
        (dotLayer.height - sunsetHeight) / 2 + scrollProgress * 18 * dpr;
      context.save();
      context.globalAlpha = (PRESET.bloom / 100) * sunsetOpacity;
      context.filter = `blur(${Math.max(3, 8 * dpr)}px)`;
      context.drawImage(
        dotLayer,
        sunsetX,
        sunsetY,
        sunsetWidth,
        sunsetHeight,
      );
      context.restore();
      context.save();
      context.globalAlpha = sunsetOpacity;
      context.drawImage(
        dotLayer,
        sunsetX,
        sunsetY,
        sunsetWidth,
        sunsetHeight,
      );
      context.restore();

      context.save();
      context.globalAlpha = mapReveal * 0.18;
      context.drawImage(australiaLayer, -2.5 * dpr, 0);
      context.globalCompositeOperation = "screen";
      context.globalAlpha = mapReveal * 0.12;
      context.drawImage(australiaLayer, 2.5 * dpr, 0);
      context.restore();

      context.save();
      context.globalAlpha =
        mapReveal * (AUSTRALIA_PRESET.bloom / 100);
      context.filter = `blur(${Math.max(3, 7 * dpr)}px)`;
      context.drawImage(australiaLayer, 0, 0);
      context.restore();
      context.save();
      context.globalAlpha = mapReveal;
      context.drawImage(australiaLayer, 0, 0);
      context.restore();

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mapReveal > 0.02) {
        context.save();
        context.globalAlpha =
          mapReveal * (AUSTRALIA_PRESET.scanLines / 100) * 0.28;
        context.fillStyle = "#020101";
        for (let y = 1; y < height; y += 4) {
          context.fillRect(0, y, width, 1);
        }
        context.restore();
      }
      const vignette = context.createRadialGradient(
        width * 0.55,
        height * 0.46,
        Math.min(width, height) * 0.12,
        width * 0.55,
        height * 0.46,
        Math.max(width, height) * 0.72,
      );
      vignette.addColorStop(0, "rgb(0 0 0 / 0)");
      vignette.addColorStop(
        1,
        `rgb(0 0 0 / ${PRESET.vignette / 100})`,
      );
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    const animate = (time: number) => {
      if (disposed || reducedMotion.matches || !visible) return;
      if (time - lastFrame >= FRAME_INTERVAL) {
        lastFrame = time;
        draw(time);
      }
      frameId = window.requestAnimationFrame(animate);
    };

    const restartAnimation = () => {
      window.cancelAnimationFrame(frameId);
      if (reducedMotion.matches || !visible) {
        draw(0);
        return;
      }
      lastFrame = -Infinity;
      frameId = window.requestAnimationFrame(animate);
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(1.75, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      dotLayer.width = canvas.width;
      dotLayer.height = canvas.height;
      australiaLayer.width = canvas.width;
      australiaLayer.height = canvas.height;
      buildSamples();
      buildAustraliaSamples();
      draw(0);
      restartAnimation();
    };

    const queueResize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(resize);
    };

    const updateScroll = () => {
      const navigationOffset = 0;
      const rect = scene.getBoundingClientRect();
      const travel = Math.max(
        1,
        scene.offsetHeight - (window.innerHeight - navigationOffset),
      );
      const rawProgress = clamp((navigationOffset - rect.top) / travel);
      scrollProgress = reducedMotion.matches
        ? rawProgress >= 0.5
          ? 1
          : 0
        : rawProgress;

      const intro = smoothstep(0.08, 0.52, scrollProgress);
      const reveal = smoothstep(0.5, 0.82, scrollProgress);
      scene.style.setProperty(
        "--hero-scroll",
        scrollProgress.toFixed(4),
      );
      scene.style.setProperty(
        "--hero-intro-opacity",
        (1 - intro).toFixed(4),
      );
      scene.style.setProperty("--hero-intro-y", `${-44 * intro}px`);
      scene.style.setProperty("--hero-preview-x", `${70 * intro}px`);
      scene.style.setProperty(
        "--hero-preview-scale",
        (1 - 0.08 * intro).toFixed(4),
      );
      scene.style.setProperty(
        "--hero-reveal-opacity",
        reveal.toFixed(4),
      );
      scene.style.setProperty(
        "--hero-reveal-y",
        `${24 * (1 - reveal)}px`,
      );
      scene.style.setProperty(
        "--hero-map-opacity",
        smoothstep(0.3, 0.78, scrollProgress).toFixed(4),
      );

      if (reducedMotion.matches || !visible) {
        draw(performance.now());
      }
    };

    const queueScroll = () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(updateScroll);
    };

    const resizeObserver = new ResizeObserver(queueResize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      restartAnimation();
    });
    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    reducedMotion.addEventListener("change", restartAnimation);
    reducedMotion.addEventListener("change", queueScroll);
    window.addEventListener("scroll", queueScroll, { passive: true });

    image.onload = () => {
      imageReady = true;
      buildSamples();
      draw(0);
    };
    image.onerror = () => {
      imageReady = false;
      buildSamples();
      draw(0);
    };
    australiaImage.onload = () => {
      australiaReady = true;
      buildAustraliaSamples();
      draw(0);
    };
    australiaImage.onerror = () => {
      australiaReady = false;
      australiaSamples = [];
      draw(0);
    };
    image.src = "/ascii-sunset.webp";
    australiaImage.src = "/australia-ascii-reference.webp";
    queueResize();
    queueScroll();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(scrollFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", restartAnimation);
      reducedMotion.removeEventListener("change", queueScroll);
      window.removeEventListener("scroll", queueScroll);
      for (const property of [
        "--hero-scroll",
        "--hero-intro-opacity",
        "--hero-intro-y",
        "--hero-preview-x",
        "--hero-preview-scale",
        "--hero-reveal-opacity",
        "--hero-reveal-y",
        "--hero-map-opacity",
      ]) {
        scene.style.removeProperty(property);
      }
    };
  }, []);

  return (
    <div className="landing-ascii" aria-hidden="true">
      <div className="landing-ascii__sticky">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
