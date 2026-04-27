import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Fog,
  GreaterDepth,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RGBAFormat,
  Scene,
  type Texture,
  UnsignedByteType,
  type WebGLRenderer,
} from "three";

export interface BossShaderWarmupTextures {
  bump?: Texture | null;
  diffuse?: Texture | null;
  normal?: Texture | null;
}

interface BossShaderWarmupBundle {
  dispose: () => void;
  render: (renderer: WebGLRenderer) => number;
}

const bossPointLightCount = 24;

const createFallbackTexture = () => {
  const texture = new DataTexture(
    new Uint8Array([190, 130, 76, 255]),
    1,
    1,
    RGBAFormat,
    UnsignedByteType
  );

  texture.needsUpdate = true;
  return texture;
};

const usableTexture = (texture: Texture | null | undefined) =>
  texture?.image ? texture : null;

const configureShadowLight = (light: DirectionalLight | PointLight) => {
  light.castShadow = true;
  light.shadow.bias = -0.0008;
  light.shadow.mapSize.set(64, 64);
};

const createBossLightRig = () => {
  const lights: Array<DirectionalLight | HemisphereLight | PointLight> = [];
  const keyLight = new DirectionalLight("#ffbd76", 2.6);

  keyLight.position.set(-5.2, 8.4, 5.8);
  configureShadowLight(keyLight);
  lights.push(keyLight);
  lights.push(new HemisphereLight("#c18455", "#050403", 0.74));

  for (let index = 0; index < bossPointLightCount; index += 1) {
    const light = new PointLight("#ff9d43", 0.035, 6.4, 1.6);
    const col = index % 6;
    const row = Math.floor(index / 6);

    light.position.set((col - 2.5) * 1.25, 1.3 + row * 0.36, -1.8 + row);

    lights.push(light);
  }

  return lights;
};

const createWarmupMaterials = ({
  bump,
  diffuse,
  normal,
}: Required<BossShaderWarmupTextures>) => [
  new MeshStandardMaterial({
    bumpMap: bump,
    bumpScale: 0.055,
    color: "#8a6240",
    map: diffuse,
    metalness: 0.22,
    roughness: 0.72,
  }),
  new MeshStandardMaterial({
    color: "#9a5d2e",
    map: diffuse,
    metalness: 0.62,
    roughness: 0.4,
    side: DoubleSide,
  }),
  new MeshStandardMaterial({
    color: "#2c2119",
    metalness: 0.58,
    roughness: 0.46,
    side: DoubleSide,
  }),
  new MeshStandardMaterial({
    color: "#24303a",
    flatShading: true,
    metalness: 0.38,
    roughness: 0.58,
  }),
  new MeshStandardMaterial({
    color: "#17202d",
    emissive: "#7df9ff",
    emissiveIntensity: 0.18,
    flatShading: true,
    metalness: 0.84,
    opacity: 0.46,
    roughness: 0.12,
    transparent: true,
  }),
  new MeshStandardMaterial({
    color: "#6b4528",
    map: diffuse,
    metalness: 0.42,
    opacity: 0.98,
    roughness: 0.52,
    side: BackSide,
    transparent: true,
  }),
  new MeshStandardMaterial({
    color: "#f5c869",
    depthWrite: false,
    map: diffuse,
    metalness: 0.08,
    opacity: 0.72,
    roughness: 0.24,
    transparent: true,
  }),
  new MeshStandardMaterial({
    color: "#76543a",
    map: diffuse,
    metalness: 0.32,
    normalMap: normal,
    roughness: 0.62,
  }),
  new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#8beeff",
    depthFunc: GreaterDepth,
    depthWrite: false,
    opacity: 0.34,
    toneMapped: false,
    transparent: true,
  }),
  new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#f5feff",
    depthWrite: false,
    opacity: 0.7,
    toneMapped: false,
    transparent: true,
  }),
  new MeshBasicMaterial({
    color: "#dffbff",
    depthWrite: false,
    opacity: 0.04,
    transparent: true,
    wireframe: true,
  }),
];

export const createBossShaderWarmupBundle = (
  textures: BossShaderWarmupTextures,
  backgroundColor: string
): BossShaderWarmupBundle => {
  const fallbackTexture = createFallbackTexture();
  const diffuse = usableTexture(textures.diffuse) ?? fallbackTexture;
  const bump = usableTexture(textures.bump) ?? diffuse;
  const normal = usableTexture(textures.normal) ?? diffuse;
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 40);
  const boxGeometry = new BoxGeometry(1, 1, 1);
  const planeGeometry = new PlaneGeometry(1, 1);
  const materials = createWarmupMaterials({ bump, diffuse, normal });
  const meshes = materials.map((material, index) => {
    const geometry = index === 0 ? planeGeometry : boxGeometry;
    const mesh = new Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.frustumCulled = false;
    mesh.position.set((index - 2.5) * 0.78, 0.18 + index * 0.04, 0);
    mesh.receiveShadow = true;
    mesh.scale.set(0.72, 0.72, 0.72);

    if (index === 0) {
      mesh.rotation.x = -Math.PI / 2;
      mesh.scale.set(1.1, 1.1, 1);
    }

    scene.add(mesh);
    return mesh;
  });

  scene.background = new Color(backgroundColor);
  scene.fog = new Fog(backgroundColor, 7, 48);
  camera.position.set(0, 2.6, 6.4);
  camera.lookAt(0, 0.35, 0);

  for (const light of createBossLightRig()) {
    scene.add(light);
  }

  return {
    dispose: () => {
      for (const mesh of meshes) {
        scene.remove(mesh);
      }

      boxGeometry.dispose();
      planeGeometry.dispose();

      for (const material of materials) {
        material.dispose();
      }

      fallbackTexture.dispose();
    },
    render: (renderer: WebGLRenderer) => {
      const startedAt = performance.now();
      const previousAutoClear = renderer.autoClear;

      try {
        renderer.compile(scene, camera);
        renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
        renderer.render(scene, camera);
      } catch {
        // This is a best-effort warmup path. The real scene render remains the
        // source of truth if a driver rejects the synthetic frame.
      } finally {
        renderer.autoClear = previousAutoClear;
      }

      return performance.now() - startedAt;
    },
  };
};
