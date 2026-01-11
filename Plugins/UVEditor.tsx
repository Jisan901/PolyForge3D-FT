import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

const UVEditorPlugin = ({ selectedObject }) => {
    const [selectedMesh, setSelectedMesh] = useState(null);
    const [uvData, setUvData] = useState([]);
    const [selectedVertex, setSelectedVertex] = useState(null);
    const [selectedVertices, setSelectedVertices] = useState(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [projectionType, setProjectionType] = useState('box');
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [showAlignMenu, setShowAlignMenu] = useState(false);
    const [showDistributeMenu, setShowDistributeMenu] = useState(false);
    const [baseUv, setBaseUv] = useState(null);


    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const canvasContainerRef = useRef(null);


    const rootRef = useRef(null);
    const uvCanvasRef = useRef(null);

    // Expose root reference
    useEffect(() => {
        if (rootRef.current && window.root) {
            //window.root({ type: 'window', ref: true, el: rootRef.current });
        }
    }, []);

    // Update selected mesh when selectedObject prop changes
    useEffect(() => {
        if (selectedObject && selectedObject.geometry) {
            setSelectedMesh(selectedObject);

            // Compute normals if they don't exist
            if (!selectedObject.geometry.attributes.normal) {
                selectedObject.geometry.computeVertexNormals();
            }
            
            if (selectedObject.geometry.uuid !== selectedMesh?.geometry?.uuid && selectedObject?.geometry?.attributes?.uv){
                setBaseUv(selectedObject.geometry.attributes.uv.clone())
            }
            
            extractUVs(selectedObject.geometry);
        } else {
            setSelectedMesh(null);
            setUvData([]);
        }
    }, [selectedObject]);

    // Extract UV coordinates from geometry
    const extractUVs = (geometry) => {
        const uvAttribute = geometry.attributes.uv;
        if (!uvAttribute) return;

        const uvs = [];
        for (let i = 0; i < uvAttribute.count; i++) {
            uvs.push({
                x: uvAttribute.getX(i),
                y: uvAttribute.getY(i),
                index: i
            });
        }
        setUvData(uvs);
    };

    // Draw UV map on canvas
    useEffect(() => {
        if (!uvCanvasRef.current || !uvData || uvData.length === 0) return;

        const canvas = uvCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);

        // Save context and apply transformations
        ctx.save();

        // Apply pan (translate to center, then offset)
        ctx.translate(w / 2, h / 2);
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 / zoom;
        for (let i = 0; i <= 10; i++) {
            const pos = (i / 10) * w;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(w, pos);
            ctx.stroke();
        }

        // Draw UV coordinates
        if (selectedMesh && selectedMesh.geometry) {
            const geometry = selectedMesh.geometry;
            const index = geometry.index;

            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 1.5 / zoom;

            if (index) {
                for (let i = 0; i < index.count; i += 3) {
                    const i1 = index.getX(i);
                    const i2 = index.getX(i + 1);
                    const i3 = index.getX(i + 2);

                    const uv1 = uvData[i1];
                    const uv2 = uvData[i2];
                    const uv3 = uvData[i3];

                    if (uv1 && uv2 && uv3) {
                        ctx.beginPath();
                        ctx.moveTo(uv1.x * w, (1 - uv1.y) * h);
                        ctx.lineTo(uv2.x * w, (1 - uv2.y) * h);
                        ctx.lineTo(uv3.x * w, (1 - uv3.y) * h);
                        ctx.closePath();
                        ctx.stroke();
                    }
                }
            }

            // Draw vertices
            uvData.forEach((uv, idx) => {
                const isSelected = selectedVertices && selectedVertices.has(idx);
                ctx.fillStyle = isSelected ? '#ef4444' : '#fff';
                ctx.beginPath();
                const radius = (isSelected ? 5 : 4) / zoom;
                ctx.arc(uv.x * w, (1 - uv.y) * h, radius, 0, Math.PI * 2);
                ctx.fill();

                if (isSelected) {
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2 / zoom;
                    ctx.stroke();
                }
            });
        }

        // Restore context
        ctx.restore();
    }, [uvData, selectedMesh, selectedVertices, zoom, pan]);

    // UV Alignment Functions
    const alignVerticesLeft = () => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);
        const minX = Math.min(...vertices.map(i => uvData[i].x));

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], x: minX };
        });
        updateUVData(newUvData);
    };

    const alignVerticesRight = () => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);
        const maxX = Math.max(...vertices.map(i => uvData[i].x));

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], x: maxX };
        });
        updateUVData(newUvData);
    };

    const alignVerticesTop = () => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);
        const maxY = Math.max(...vertices.map(i => uvData[i].y));

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], y: maxY };
        });
        updateUVData(newUvData);
    };

    const alignVerticesBottom = () => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);
        const minY = Math.min(...vertices.map(i => uvData[i].y));

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], y: minY };
        });
        updateUVData(newUvData);
    };

    const alignVerticesCenterH = () => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);
        const minX = Math.min(...vertices.map(i => uvData[i].x));
        const maxX = Math.max(...vertices.map(i => uvData[i].x));
        const centerX = (minX + maxX) / 2;

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], x: centerX };
        });
        updateUVData(newUvData);
    };

    const alignVerticesCenterV = () => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);
        const minY = Math.min(...vertices.map(i => uvData[i].y));
        const maxY = Math.max(...vertices.map(i => uvData[i].y));
        const centerY = (minY + maxY) / 2;

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], y: centerY };
        });
        updateUVData(newUvData);
    };

    const straightenHorizontal = () => {
        if (selectedVertices.size < 2) return;
        const vertices = Array.from(selectedVertices);
        const avgY = vertices.reduce((sum, i) => sum + uvData[i].y, 0) / vertices.length;

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], y: avgY };
        });
        updateUVData(newUvData);
    };

    const straightenVertical = () => {
        if (selectedVertices.size < 2) return;
        const vertices = Array.from(selectedVertices);
        const avgX = vertices.reduce((sum, i) => sum + uvData[i].x, 0) / vertices.length;

        const newUvData = [...uvData];
        vertices.forEach(i => {
            newUvData[i] = { ...newUvData[i], x: avgX };
        });
        updateUVData(newUvData);
    };

    const distributeHorizontal = () => {
        if (selectedVertices.size < 3) return;
        const vertices = Array.from(selectedVertices).sort((a, b) => uvData[a].x - uvData[b].x);
        const minX = uvData[vertices[0]].x;
        const maxX = uvData[vertices[vertices.length - 1]].x;
        const step = (maxX - minX) / (vertices.length - 1);

        const newUvData = [...uvData];
        vertices.forEach((i, idx) => {
            newUvData[i] = { ...newUvData[i], x: minX + step * idx };
        });
        updateUVData(newUvData);
    };

    const distributeVertical = () => {
        if (selectedVertices.size < 3) return;
        const vertices = Array.from(selectedVertices).sort((a, b) => uvData[a].y - uvData[b].y);
        const minY = uvData[vertices[0]].y;
        const maxY = uvData[vertices[vertices.length - 1]].y;
        const step = (maxY - minY) / (vertices.length - 1);

        const newUvData = [...uvData];
        vertices.forEach((i, idx) => {
            newUvData[i] = { ...newUvData[i], y: minY + step * idx };
        });
        updateUVData(newUvData);
    };

    const snapToGrid = (gridSize = 0.1) => {
        if (selectedVertices.size === 0) return;
        const vertices = Array.from(selectedVertices);

        const newUvData = [...uvData];
        vertices.forEach(i => {
            const x = Math.round(uvData[i].x / gridSize) * gridSize;
            const y = Math.round(uvData[i].y / gridSize) * gridSize;
            newUvData[i] = { ...newUvData[i], x, y };
        });
        updateUVData(newUvData);
    };

    const updateUVData = (newUvData) => {
        setUvData(newUvData);
        if (selectedMesh) {
            const uvAttribute = selectedMesh.geometry.attributes.uv;
            newUvData.forEach((uv, i) => {
                uvAttribute.setXY(i, uv.x, uv.y);
            });
            uvAttribute.needsUpdate = true;
        }
    };

    // Smart UV Projection Functions
    const applyBoxProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const normal = geometry.attributes.normal;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const nx = normal.getX(i);
            const ny = normal.getY(i);
            const nz = normal.getZ(i);

            const absNx = Math.abs(nx);
            const absNy = Math.abs(ny);
            const absNz = Math.abs(nz);

            let u, v;

            if (absNx > absNy && absNx > absNz) {
                u = (z + 0.5);
                v = (y + 0.5);
            } else if (absNy > absNx && absNy > absNz) {
                u = (x + 0.5);
                v = (z + 0.5);
            } else {
                u = (x + 0.5);
                v = (y + 0.5);
            }

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyCylindricalProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
            const v = 0.5 + y;

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applySphericalProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const r = Math.sqrt(x * x + y * y + z * z);
            const theta = Math.atan2(z, x);
            const phi = Math.acos(y / r);

            const u = 0.5 + theta / (2 * Math.PI);
            const v = phi / Math.PI;

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyPlanarProjection = (geometry, axis = 'z') => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            let u, v;

            switch (axis) {
                case 'x':
                    u = (y + 0.5);
                    v = (z + 0.5);
                    break;
                case 'y':
                    u = (x + 0.5);
                    v = (z + 0.5);
                    break;
                case 'z':
                default:
                    u = (x + 0.5);
                    v = (y + 0.5);
                    break;
            }

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyCubicProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const normal = geometry.attributes.normal;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const nx = normal.getX(i);
            const ny = normal.getY(i);
            const nz = normal.getZ(i);

            const absNx = Math.abs(nx);
            const absNy = Math.abs(ny);
            const absNz = Math.abs(nz);

            let u, v;

            if (absNx > absNy && absNx > absNz) {
                u = (z * Math.sign(nx) + 0.5);
                v = (y + 0.5);
            } else if (absNy > absNx && absNy > absNz) {
                u = (x + 0.5);
                v = (z * Math.sign(ny) + 0.5);
            } else {
                u = (x * Math.sign(nz) + 0.5);
                v = (y + 0.5);
            }

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyTubeProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const angle = Math.atan2(z, x);
            const u = 0.5 + angle / (2 * Math.PI);
            const v = 0.5 + y;

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyFollowActiveQuadsProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const index = geometry.index;

        if (!index) return;

        for (let faceIdx = 0; faceIdx < index.count / 3; faceIdx++) {
            const i1 = index.getX(faceIdx * 3);
            const i2 = index.getX(faceIdx * 3 + 1);
            const i3 = index.getX(faceIdx * 3 + 2);

            const v1 = new THREE.Vector3(
                position.getX(i1),
                position.getY(i1),
                position.getZ(i1)
            );
            const v2 = new THREE.Vector3(
                position.getX(i2),
                position.getY(i2),
                position.getZ(i2)
            );
            const v3 = new THREE.Vector3(
                position.getX(i3),
                position.getY(i3),
                position.getZ(i3)
            );

            const edge1 = new THREE.Vector3().subVectors(v2, v1);
            const edge2 = new THREE.Vector3().subVectors(v3, v1);
            const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            const absNx = Math.abs(normal.x);
            const absNy = Math.abs(normal.y);
            const absNz = Math.abs(normal.z);

            if (absNx > absNy && absNx > absNz) {
                uv.setXY(i1, (v1.y + 0.5), (v1.z + 0.5));
                uv.setXY(i2, (v2.y + 0.5), (v2.z + 0.5));
                uv.setXY(i3, (v3.y + 0.5), (v3.z + 0.5));
            } else if (absNy > absNx && absNy > absNz) {
                uv.setXY(i1, (v1.x + 0.5), (v1.z + 0.5));
                uv.setXY(i2, (v2.x + 0.5), (v2.z + 0.5));
                uv.setXY(i3, (v3.x + 0.5), (v3.z + 0.5));
            } else {
                uv.setXY(i1, (v1.x + 0.5), (v1.y + 0.5));
                uv.setXY(i2, (v2.x + 0.5), (v2.y + 0.5));
                uv.setXY(i3, (v3.x + 0.5), (v3.y + 0.5));
            }
        }

        uv.needsUpdate = true;
    };

    const applyNormalBasedProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const normal = geometry.attributes.normal;

        for (let i = 0; i < position.count; i++) {
            const nx = normal.getX(i);
            const ny = normal.getY(i);

            const u = 0.5 + nx * 0.5;
            const v = 0.5 + ny * 0.5;

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyConicalProjection = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const radius = Math.sqrt(x * x + z * z);
            const angle = Math.atan2(z, x);

            const u = 0.5 + angle / (2 * Math.PI);
            const v = 0.5 + radius * Math.sign(y) * 0.5;

            uv.setXY(i, u, v);
        }

        uv.needsUpdate = true;
    };

    const applyFaceUnwrap = (geometry) => {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const index = geometry.index;

        if (!index) return;

        const faceCount = index.count / 3;
        const facesPerRow = Math.ceil(Math.sqrt(faceCount));
        const cellSize = 1 / facesPerRow;
        const padding = cellSize * 0.05;
        const innerSize = cellSize - (padding * 2);

        for (let faceIdx = 0; faceIdx < faceCount; faceIdx++) {
            const i1 = index.getX(faceIdx * 3);
            const i2 = index.getX(faceIdx * 3 + 1);
            const i3 = index.getX(faceIdx * 3 + 2);

            const v1 = new THREE.Vector3(
                position.getX(i1),
                position.getY(i1),
                position.getZ(i1)
            );
            const v2 = new THREE.Vector3(
                position.getX(i2),
                position.getY(i2),
                position.getZ(i2)
            );
            const v3 = new THREE.Vector3(
                position.getX(i3),
                position.getY(i3),
                position.getZ(i3)
            );

            const edge1 = new THREE.Vector3().subVectors(v2, v1);
            const edge2 = new THREE.Vector3().subVectors(v3, v1);
            const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            const tangent = edge1.normalize();
            const bitangent = new THREE.Vector3().crossVectors(normal, tangent);

            const p1 = new THREE.Vector2(0, 0);
            const p2 = new THREE.Vector2(
                edge1.dot(tangent),
                edge1.dot(bitangent)
            );
            const edge2Vec = new THREE.Vector3().subVectors(v3, v1);
            const p3 = new THREE.Vector2(
                edge2Vec.dot(tangent),
                edge2Vec.dot(bitangent)
            );

            const minX = Math.min(p1.x, p2.x, p3.x);
            const maxX = Math.max(p1.x, p2.x, p3.x);
            const minY = Math.min(p1.y, p2.y, p3.y);
            const maxY = Math.max(p1.y, p2.y, p3.y);

            const width = maxX - minX;
            const height = maxY - minY;
            const scale = Math.max(width, height);

            const normalize = (p) => {
                if (scale === 0) return new THREE.Vector2(0.5, 0.5);
                return new THREE.Vector2(
                    (p.x - minX) / scale,
                    (p.y - minY) / scale
                );
            };

            const n1 = normalize(p1);
            const n2 = normalize(p2);
            const n3 = normalize(p3);

            const row = Math.floor(faceIdx / facesPerRow);
            const col = faceIdx % facesPerRow;

            const offsetX = col * cellSize + padding;
            const offsetY = row * cellSize + padding;

            uv.setXY(i1, offsetX + n1.x * innerSize, offsetY + n1.y * innerSize);
            uv.setXY(i2, offsetX + n2.x * innerSize, offsetY + n2.y * innerSize);
            uv.setXY(i3, offsetX + n3.x * innerSize, offsetY + n3.y * innerSize);
        }

        uv.needsUpdate = true;
    };

    const applySmartProjection = (type) => {
        if (!selectedMesh) return;

        const geometry = selectedMesh.geometry;

        if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
        }

        switch (type) {
            case 'box':
                applyBoxProjection(geometry);
                break;
            case 'cylindrical':
                applyCylindricalProjection(geometry);
                break;
            case 'spherical':
                applySphericalProjection(geometry);
                break;
            case 'planar-x':
                applyPlanarProjection(geometry, 'x');
                break;
            case 'planar-y':
                applyPlanarProjection(geometry, 'y');
                break;
            case 'planar-z':
                applyPlanarProjection(geometry, 'z');
                break;
            case 'cubic':
                applyCubicProjection(geometry);
                break;
            case 'tube':
                applyTubeProjection(geometry);
                break;
            case 'follow-active':
                applyFollowActiveQuadsProjection(geometry);
                break;
            case 'normal':
                applyNormalBasedProjection(geometry);
                break;
            case 'conical':
                applyConicalProjection(geometry);
                break;
            case 'unwrap':
                applyFaceUnwrap(geometry);
                break;
        }

        extractUVs(geometry);
        setProjectionType(type);
    };

    // Handle canvas pointer events
    const handleCanvasPointerDown = (e) => {
        if (isPanning) return;

        const { u, v } = screenToUV(e.clientX, e.clientY);

        let closest = null;
        let minDist = 0.08 / zoom; // Adjust hit detection for zoom

        uvData.forEach((uv, idx) => {
            const dist = Math.sqrt((uv.x - u) ** 2 + (uv.y - v) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = idx;
            }
        });



        const canvas = uvCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - (e.clientY - rect.top) / rect.height;

        // let closest = null;
        // let minDist = 0.08;

        uvData.forEach((uv, idx) => {
            const dist = Math.sqrt((uv.x - x) ** 2 + (uv.y - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = idx;
            }
        });

        if (closest !== null) {
            if (isMultiSelect || e.shiftKey || e.ctrlKey) {
                const newSelected = new Set(selectedVertices);
                if (newSelected.has(closest)) {
                    newSelected.delete(closest);
                } else {
                    newSelected.add(closest);
                }
                setSelectedVertices(newSelected);
                setSelectedVertex(closest);
            } else {
                if (!selectedVertices.has(closest)) {
                    setSelectedVertices(new Set([closest]));
                }
                setSelectedVertex(closest);
                setIsDragging(true);
                canvas.setPointerCapture(e.pointerId);
            }
        } else if (!isMultiSelect && !e.shiftKey && !e.ctrlKey) {
            setSelectedVertices(new Set());
            setSelectedVertex(null);
        }
    };

    const handleCanvasPointerMove = (e) => {
        if (isPanning) return;
        if (!isDragging || selectedVertex === null) return;

        const { u, v } = screenToUV(e.clientX, e.clientY);

        const x = Math.max(0, Math.min(1, u));
        const y = Math.max(0, Math.min(1, v));

        const canvas = uvCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        //   const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        //   const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

        // Cancel drag if pointer moves too far outside canvas (touch devices)
        const distX = e.clientX - rect.left;
        const distY = e.clientY - rect.top;
        const maxDist = rect.width * 0.2; // 20% outside canvas

        if (distX < -maxDist || distX > rect.width + maxDist ||
            distY < -maxDist || distY > rect.height + maxDist) {
            canvas.releasePointerCapture(e.pointerId);
            setIsDragging(false);
            return;
        }

        const deltaX = x - uvData[selectedVertex].x;
        const deltaY = y - uvData[selectedVertex].y;

        const newUvData = [...uvData];
        selectedVertices.forEach(i => {
            const newX = Math.max(0, Math.min(1, newUvData[i].x + deltaX));
            const newY = Math.max(0, Math.min(1, newUvData[i].y + deltaY));
            newUvData[i] = { ...newUvData[i], x: newX, y: newY };
        });

        setUvData(newUvData);

        if (selectedMesh) {
            const uvAttribute = selectedMesh.geometry.attributes.uv;
            selectedVertices.forEach(i => {
                uvAttribute.setXY(i, newUvData[i].x, newUvData[i].y);
            });
            uvAttribute.needsUpdate = true;
        }
    };

    const handleCanvasPointerUp = (e) => {
        if (isDragging) {
            const canvas = uvCanvasRef.current;
            canvas.releasePointerCapture(e.pointerId);
            setIsDragging(false);
        }
    };

    const resetUVs = () => {
        if (!selectedMesh && !baseUv) return;
        const geometry = selectedMesh.geometry;

        
        geometry.setAttribute('uv', baseUv.clone());

        
        extractUVs(geometry);
        
    };





    const screenToUV = (clientX, clientY) => {
        const canvas = uvCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const w = canvas.width;
        const h = canvas.height;

        // Get position relative to canvas
        let x = (clientX - rect.left) / rect.width * w;
        let y = (clientY - rect.top) / rect.height * h;

        // Reverse the transformations
        // 1. Translate back from center
        x -= w / 2;
        y -= h / 2;

        // 2. Reverse pan
        x -= pan.x;
        y -= pan.y;

        // 3. Reverse scale
        x /= zoom;
        y /= zoom;

        // 4. Translate back to origin
        x += w / 2;
        y += h / 2;

        // Convert to UV coordinates (0-1 range)
        const u = x / w;
        const v = 1 - (y / h);

        return { u, v };
    };


    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
    };

    const handlePanStart = (e) => {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        canvasContainerRef.current?.setPointerCapture(e.pointerId);
    };

    // Update your draw function to apply zoom and pan transformations


    const lastTouchDistance = useRef(null);
    const lastTouches = useRef([]);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dist = getTouchDistance(e.touches);
            lastTouchDistance.current = dist;
            lastTouches.current = Array.from(e.touches);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();

            // Pinch zoom
            const dist = getTouchDistance(e.touches);
            if (lastTouchDistance.current) {
                const delta = (dist - lastTouchDistance.current) * 0.01;
                setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
            }
            lastTouchDistance.current = dist;

            // Two-finger pan
            if (lastTouches.current.length === 2) {
                const dx = (e.touches[0].clientX + e.touches[1].clientX) / 2 -
                    (lastTouches.current[0].clientX + lastTouches.current[1].clientX) / 2;
                const dy = (e.touches[0].clientY + e.touches[1].clientY) / 2 -
                    (lastTouches.current[0].clientY + lastTouches.current[1].clientY) / 2;
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            }
            lastTouches.current = Array.from(e.touches);
        }
    };

    const handleTouchEnd = () => {
        lastTouchDistance.current = null;
        lastTouches.current = [];
    };

    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };




    return (
        <div ref={rootRef} className="flex gap-3 p-3 bg-[#1e1e1e] text-[#cccccc] h-full">
            {/* Canvas Side */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-[#e0e0e0]">UV Editor</h3>
                    {selectedMesh && (
                        <div className="flex items-center gap-2">
                            <button
                                onPointerDown={(e) => { e.preventDefault(); setZoom(Math.max(0.5, zoom - 0.25)); }}
                                className="px-3 py-2 bg-[#3e3e42] hover:bg-[#505050] active:bg-[#505050] rounded text-xs text-[#cccccc] transition touch-none"
                                title="Zoom Out"
                            >
                                −
                            </button>
                            <span className="text-[10px] text-[#858585] min-w-[3rem] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onPointerDown={(e) => { e.preventDefault(); setZoom(Math.min(5, zoom + 0.25)); }}
                                className="px-3 py-2 bg-[#3e3e42] hover:bg-[#505050] active:bg-[#505050] rounded text-xs text-[#cccccc] transition touch-none"
                                title="Zoom In"
                            >
                                +
                            </button>
                            <button
                                onPointerDown={(e) => { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }}
                                className="px-3 py-2 bg-[#3e3e42] hover:bg-[#505050] active:bg-[#505050] rounded text-xs text-[#cccccc] transition touch-none"
                                title="Reset View"
                            >
                                ⊡
                            </button>
                        </div>
                    )}
                </div>

                {!selectedMesh && (
                    <div className="flex-1 flex items-center justify-center bg-[#252526] rounded border border-[#3e3e42]">
                        <div className="text-center text-[#858585] text-xs">
                            <div className="mb-1">No object selected</div>
                            <div className="text-[10px]">Select a mesh to edit UVs</div>
                        </div>
                    </div>
                )}

                {selectedMesh && (
                    <>
                        <div
                            ref={canvasContainerRef}
                            className="relative w-full bg-[#252526] rounded border border-[#3e3e42] overflow-hidden"
                            style={{ paddingBottom: '100%' }}
                            onWheel={handleWheel}
                            onPointerDown={(e) => {
                                // Two-finger or Alt+click for panning on desktop
                                if (e.pointerType === 'touch' && lastTouchDistance.current !== null) {
                                    handlePanStart(e);
                                } else if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
                                    handlePanStart(e);
                                }
                            }}
                            onPointerMove={(e) => {
                                if (isPanning) {
                                    handlePanMove(e);
                                }
                            }}
                            onPointerUp={(e) => {
                                if (isPanning) {
                                    handlePanEnd(e);
                                }
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <canvas
                                ref={uvCanvasRef}
                                width={400}
                                height={400}
                                className="absolute inset-0 w-full h-full touch-none"
                                style={{
                                    cursor: isPanning ? 'grabbing' : (isDragging ? 'move' : 'crosshair')
                                }}
                                onPointerDown={handleCanvasPointerDown}
                                onPointerMove={handleCanvasPointerMove}
                                onPointerUp={handleCanvasPointerUp}
                                onPointerCancel={handleCanvasPointerUp}
                            />
                        </div>

                        <div className="mt-2 p-2 bg-[#252526] rounded border border-[#3e3e42] text-[10px]">
                            {selectedVertices.size > 0 ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[#4fc3f7] font-medium">{selectedVertices.size}</span>
                                    <span className="text-[#858585]">selected</span>
                                    {selectedVertex !== null && uvData[selectedVertex] && (
                                        <span className="ml-auto text-[#858585]">
                                            U: <span className="text-[#b5cea8]">{uvData[selectedVertex].x.toFixed(3)}</span>
                                            {' '}V: <span className="text-[#b5cea8]">{uvData[selectedVertex].y.toFixed(3)}</span>
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-[#858585]">Pinch to zoom • Two-finger drag to pan</span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Options Side */}
            <div className="w-56 flex flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 #1e1e1e' }}>
                <div className="flex items-center justify-between p-2 bg-[#252526] rounded border border-[#3e3e42]">
                    <span className="text-[10px] text-[#cccccc] font-medium">Selection Mode</span>
                    <button
                        onPointerDown={(e) => { e.preventDefault(); setIsMultiSelect(!isMultiSelect); }}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition touch-none ${isMultiSelect
                                ? 'bg-[#0e639c] text-white hover:bg-[#1177bb]'
                                : 'bg-[#3e3e42] text-[#cccccc] hover:bg-[#505050]'
                            }`}
                    >
                        {isMultiSelect ? 'Multi' : 'Single'}
                    </button>
                </div>

                {selectedMesh && (
                    <>
                        <details className="bg-[#252526] rounded border border-[#3e3e42]">
                            <summary className="px-2 py-2 cursor-pointer text-[11px] font-medium text-[#cccccc] hover:bg-[#2a2d2e] active:bg-[#2a2d2e] list-none flex items-center justify-between touch-none">
                                <span>Projection</span>
                                <span className="text-[#858585] text-[10px]">▼</span>
                            </summary>
                            <div className="p-2 grid grid-cols-2 gap-1">
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('unwrap'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'unwrap' ? 'bg-[#c586c0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Unwrap</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('box'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'box' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Box</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('cubic'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'cubic' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Cubic</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('cylindrical'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'cylindrical' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Cylinder</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('tube'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'tube' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Tube</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('spherical'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'spherical' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Sphere</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('conical'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'conical' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Cone</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('planar-x'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'planar-x' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Planar X</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('planar-y'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'planar-y' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Planar Y</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('planar-z'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'planar-z' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Planar Z</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('follow-active'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'follow-active' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Follow</button>
                                <button onPointerDown={(e) => { e.preventDefault(); applySmartProjection('normal'); }} className={`px-2 py-2 rounded text-[10px] transition touch-none ${projectionType === 'normal' ? 'bg-[#4ec9b0] text-white' : 'bg-[#3e3e42] text-[#cccccc] active:bg-[#505050]'}`}>Normal</button>
                            </div>
                        </details>

                        <details className="bg-[#252526] rounded border border-[#3e3e42]" open={showAlignMenu} onToggle={(e) => setShowAlignMenu(e.target.open)}>
                            <summary className="px-2 py-2 cursor-pointer text-[11px] font-medium text-[#cccccc] hover:bg-[#2a2d2e] active:bg-[#2a2d2e] list-none flex items-center justify-between touch-none">
                                <span>Align</span>
                                <span className="text-[#858585] text-[10px]">▼</span>
                            </summary>
                            <div className="p-2 space-y-1">
                                <div className="grid grid-cols-3 gap-1">
                                    <button onPointerDown={(e) => { e.preventDefault(); alignVerticesLeft(); }} disabled={selectedVertices.size === 0} className="px-2 py-2 bg-[#264f78] active:bg-[#2d5c8f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">← L</button>
                                    <button onPointerDown={(e) => { e.preventDefault(); alignVerticesCenterH(); }} disabled={selectedVertices.size === 0} className="px-2 py-2 bg-[#264f78] active:bg-[#2d5c8f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">↔ C</button>
                                    <button onPointerDown={(e) => { e.preventDefault(); alignVerticesRight(); }} disabled={selectedVertices.size === 0} className="px-2 py-2 bg-[#264f78] active:bg-[#2d5c8f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">R →</button>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <button onPointerDown={(e) => { e.preventDefault(); alignVerticesTop(); }} disabled={selectedVertices.size === 0} className="px-2 py-2 bg-[#264f78] active:bg-[#2d5c8f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">↑ T</button>
                                    <button onPointerDown={(e) => { e.preventDefault(); alignVerticesCenterV(); }} disabled={selectedVertices.size === 0} className="px-2 py-2 bg-[#264f78] active:bg-[#2d5c8f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">↕ C</button>
                                    <button onPointerDown={(e) => { e.preventDefault(); alignVerticesBottom(); }} disabled={selectedVertices.size === 0} className="px-2 py-2 bg-[#264f78] active:bg-[#2d5c8f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">↓ B</button>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                    <button onPointerDown={(e) => { e.preventDefault(); straightenHorizontal(); }} disabled={selectedVertices.size < 2} className="px-2 py-2 bg-[#1a5c6b] active:bg-[#206e7f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">— H</button>
                                    <button onPointerDown={(e) => { e.preventDefault(); straightenVertical(); }} disabled={selectedVertices.size < 2} className="px-2 py-2 bg-[#1a5c6b] active:bg-[#206e7f] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">| V</button>
                                </div>
                            </div>
                        </details>

                        <details className="bg-[#252526] rounded border border-[#3e3e42]" open={showDistributeMenu} onToggle={(e) => setShowDistributeMenu(e.target.open)}>
                            <summary className="px-2 py-2 cursor-pointer text-[11px] font-medium text-[#cccccc] hover:bg-[#2a2d2e] active:bg-[#2a2d2e] list-none flex items-center justify-between touch-none">
                                <span>Distribute</span>
                                <span className="text-[#858585] text-[10px]">▼</span>
                            </summary>
                            <div className="p-2 space-y-1">
                                <div className="grid grid-cols-2 gap-1">
                                    <button onPointerDown={(e) => { e.preventDefault(); distributeHorizontal(); }} disabled={selectedVertices.size < 3} className="px-2 py-2 bg-[#1e5c4d] active:bg-[#247060] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">⟷ H</button>
                                    <button onPointerDown={(e) => { e.preventDefault(); distributeVertical(); }} disabled={selectedVertices.size < 3} className="px-2 py-2 bg-[#1e5c4d] active:bg-[#247060] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none">⟺ V</button>
                                </div>
                                <button onPointerDown={(e) => { e.preventDefault(); snapToGrid(0.1); }} disabled={selectedVertices.size === 0} className="w-full px-2 py-2 bg-[#1e5c4d] active:bg-[#247060] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[10px] text-white transition touch-none"># Grid</button>
                            </div>
                        </details>

                        <button onPointerDown={(e) => { e.preventDefault(); resetUVs(); }} className="w-full px-2 py-2 bg-[#0e639c] active:bg-[#1177bb] rounded text-[10px] font-medium text-white transition touch-none">Reset UVs</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default UVEditorPlugin;