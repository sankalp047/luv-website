import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ParticlesBg({ color = "#E31837", count = 80, opacity = 0.4 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      velocities.push({
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.3,
        z: (Math.random() - 0.5) * 0.15,
      });
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 3,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Subtle connecting lines
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: opacity * 0.15,
      blending: THREE.AdditiveBlending,
    });

    let mouseX = 0, mouseY = 0;
    const handleMouse = (e) => {
      mouseX = (e.clientX / w - 0.5) * 30;
      mouseY = (e.clientY / h - 0.5) * 30;
    };
    window.addEventListener("mousemove", handleMouse);

    // Scroll-based rotation
    let scrollY = 0;
    const handleScroll = () => { scrollY = window.scrollY; };
    window.addEventListener("scroll", handleScroll, { passive: true });

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const pos = geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Wrap around
        if (Math.abs(pos[i * 3]) > 300) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 300) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 150) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;

      // Mouse parallax
      camera.position.x += (mouseX - camera.position.x) * 0.03;
      camera.position.y += (-mouseY - camera.position.y) * 0.03;

      // Scroll rotation
      particles.rotation.y = scrollY * 0.0003;
      particles.rotation.x = scrollY * 0.0001;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [color, count, opacity]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}
