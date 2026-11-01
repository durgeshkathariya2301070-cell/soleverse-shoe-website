// The actual 3D scene. This is the ONLY file that imports Three.js, React Three Fiber and Drei.
// Shoe3DViewer.jsx loads this file on demand (lazy), so the 3D code is downloaded only when someone
// opens a 3D view, and the rest of the site stays light.
//
// NOTE: this file needs `three`, `@react-three/fiber` and `@react-three/drei` installed (see README).
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import {
  applyCustomColors,
  cloneMaterials,
  disposeMaterials,
  getSupportedCustomizations,
  indexMaterialsByName,
  listMaterialNames,
} from '../utils/modelMaterials.js'

const TARGET_SIZE = 1.8 // the longest side of any model is scaled to this size, so every model fits the view
const MIN_DISTANCE = 2.2 // closest the camera may get
const MAX_DISTANCE = 6 // furthest the camera may get
const ROTATE_STEP = Math.PI / 8 // 22.5 degrees per press of the rotate buttons
const ZOOM_STEP = 0.8 // each zoom press changes the distance by 20%
const UP = new Vector3(0, 1, 0)

// ---- The shoe model ---------------------------------------------------------
function Model({ modelPath, modelRotation, materialConfig, colors, onMaterialsDetected, onReady }) {
  // `false` = do not use Draco decoding, which would download a decoder from the internet.
  // Export your .glb without Draco compression (Meshopt compression is fine).
  const { scene } = useGLTF(modelPath, false)
  const invalidate = useThree((state) => state.invalidate)

  // Work on a private copy: clone the scene and its materials so the shared cached model is never changed.
  // Then measure it so we can centre it and scale it to fit.
  const prepared = useMemo(() => {
    const root = scene.clone(true)
    cloneMaterials(root)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = TARGET_SIZE / (Math.max(size.x, size.y, size.z) || 1)
    return {
      root,
      index: indexMaterialsByName(root),
      scale,
      offset: center.clone().negate(), // moves the model's centre to the middle of the scene
      floorY: -(size.y / 2) * scale, // where the soft ground shadow sits
    }
  }, [scene])

  // Once the model is ready: report which customisable parts it really has, and say we are ready.
  useEffect(() => {
    const supported = getSupportedCustomizations(materialConfig, prepared.index)
    onMaterialsDetected?.(supported.map((item) => item.id))
    if (import.meta.env.DEV) {
      // Handy while setting up a new model: shows the material names to use in products.js.
      console.info('[Shoe3DViewer] material names found in this model:', listMaterialNames(prepared.root))
    }
    onReady?.()
  }, [prepared, materialConfig, onMaterialsDetected, onReady])

  // Apply the chosen colours. Because the scene only renders when asked ("demand" mode), we also ask for a redraw.
  useEffect(() => {
    applyCustomColors(prepared.index, materialConfig, colors)
    invalidate()
  }, [prepared, materialConfig, colors, invalidate])

  // Free the GPU memory of our private material copies when the model goes away.
  useEffect(() => () => disposeMaterials(prepared.index), [prepared])

  return (
    <>
      <group rotation={modelRotation}>
        <group scale={prepared.scale}>
          <primitive object={prepared.root} position={prepared.offset} />
        </group>
      </group>
      {/* One soft shadow, drawn once (frames={1}) so it costs almost nothing. */}
      <ContactShadows position={[0, prepared.floorY - 0.01, 0]} opacity={0.3} scale={6} blur={2.5} far={2} frames={1} />
    </>
  )
}

// ---- Button commands (rotate / zoom / reset) --------------------------------
// The on-screen buttons work for keyboard users too, so they do not rely on dragging.
function CameraCommands({ controlsRef, command }) {
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const controls = controlsRef.current
    if (!command || !controls) return

    if (command.name === 'reset') {
      controls.reset()
    } else {
      const offset = camera.position.clone().sub(controls.target)
      if (command.name === 'rotate-left') offset.applyAxisAngle(UP, ROTATE_STEP)
      if (command.name === 'rotate-right') offset.applyAxisAngle(UP, -ROTATE_STEP)
      if (command.name === 'zoom-in') offset.multiplyScalar(ZOOM_STEP)
      if (command.name === 'zoom-out') offset.multiplyScalar(1 / ZOOM_STEP)
      offset.setLength(Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, offset.length())))
      camera.position.copy(controls.target).add(offset)
    }
    controls.update()
    invalidate()
  }, [command, controlsRef, camera, invalidate])

  return null
}

// ---- The canvas ---------------------------------------------------------------
export default function Shoe3DScene({
  modelPath,
  modelRotation = [0, 0, 0],
  materialConfig = [],
  colors = {},
  command = null,
  onMaterialsDetected,
  onReady,
  onError,
}) {
  const controlsRef = useRef(null)
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  return (
    <Canvas
      // Draw a new frame only when something changes, so an idle viewer uses almost no power.
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [2.6, 1.3, 3.0], fov: 35, near: 0.1, far: 50 }}
      style={{ position: 'absolute', inset: 0 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          onError?.(new Error('The graphics context was lost.'))
        })
      }}
    >
      {/* Simple studio lighting: soft fill from above, a key light and a cool rim light. */}
      <hemisphereLight args={['#ffffff', '#c9c9c0', 0.9]} />
      <directionalLight position={[4, 6, 3]} intensity={1.8} />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} color="#dfe8ff" />

      <Suspense fallback={null}>
        <Model
          modelPath={modelPath}
          modelRotation={modelRotation}
          materialConfig={materialConfig}
          colors={colors}
          onMaterialsDetected={onMaterialsDetected}
          onReady={onReady}
        />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.7}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        minPolarAngle={Math.PI * 0.15} // cannot go straight over the top
        maxPolarAngle={Math.PI * 0.52} // cannot look from underneath the floor
      />
      <CameraCommands controlsRef={controlsRef} command={command} />
    </Canvas>
  )
}
