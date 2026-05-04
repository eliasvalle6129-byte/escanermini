const video = document.getElementById('video');
let faceMatcher = null;
let labeledDescriptors = []; // Acá guardamos los datos de las caras de IA
let personasRegistradas = []; // Acá guardamos el texto para mostrar en la lista
let currentStream = null;
let canvas = null;
let scanInterval = null;

// Cargamos los modelos
async function cargarModelos() {
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'; 
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        document.getElementById('status').innerText = "Sistema Listo. Elige una opción arriba.";
        cambiarSeccion('lista'); // Arranca mostrando la lista
    } catch (error) {
        document.getElementById('status').innerText = "Error cargando modelos.";
        console.error(error);
    }
}

// Control de secciones
function cambiarSeccion(seccion) {
    // Ocultar todas
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.menu button').forEach(b => b.classList.remove('activo'));
    
    // Apagar cámara si salimos de registro o escaneo
    if(seccion === 'lista') detenerCamara();

    // Mostrar la seleccionada
    document.getElementById(`sec-${seccion}`).classList.add('activa');
    document.getElementById(`btn-${seccion}`).classList.add('activo');
}

// Encender la cámara (recibe 'user' para frontal o 'environment' para trasera)
function encenderCamara(tipo) {
    detenerCamara(); // Apaga la anterior si estaba prendida
    document.getElementById('container').style.display = 'inline-block';
    document.getElementById('status').innerText = "Iniciando cámara...";

    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: tipo } 
    })
    .then(stream => { 
        currentStream = stream;
        video.srcObject = stream;
        document.getElementById('status').innerText = "Cámara activa.";
    })
    .catch(err => {
        document.getElementById('status').innerText = "Error con la cámara.";
    });
}

function detenerCamara() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        document.getElementById('container').style.display = 'none';
        if (canvas) { canvas.remove(); canvas = null; }
        if (scanInterval) { clearInterval(scanInterval); }
    }
}

// Guardar nueva persona
async function guardarPerfil() {
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const pais = document.getElementById('pais').value;

    if (!nombre || !apellido) return alert("Completa nombre y apellido.");
    if (!currentStream) return alert("Primero enciende una cámara.");

    document.getElementById('status').innerText = "Escaneando rostro... quieto ahí.";
    
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    
    if (detection) {
        const info = `${nombre} ${apellido} (${pais})`;
        
        // Agregamos a la IA
        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(info, [detection.descriptor]));
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // Tolerancia del 60%
        
        // Agregamos a la lista visual
        personasRegistradas.push(info);
        actualizarListaVisual();

        document.getElementById('status').innerText = `¡${nombre} registrado correctamente!`;
        
        // Limpiamos los campos
        document.getElementById('nombre').value = '';
        document.getElementById('apellido').value = '';
        document.getElementById('pais').value = '';
    } else {
        alert("No se detectó rostro. Ilumina mejor tu cara.");
        document.getElementById('status').innerText = "Intenta de nuevo.";
    }
}

// Actualizar el HTML de la Lista
function actualizarListaVisual() {
    const ul = document.getElementById('lista-caras');
    ul.innerHTML = ''; // Borra lo anterior
    personasRegistradas.forEach(persona => {
        const li = document.createElement('li');
        li.innerText = persona;
        ul.appendChild(li);
    });
}

// Dibujar recuadros en vivo
video.addEventListener('play', () => {
    if (canvas) canvas.remove(); // Borrar canvas viejo si cambiamos de cámara
    canvas = faceapi.createCanvasFromMedia(video);
    document.getElementById('container').append(canvas);
    
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    if (scanInterval) clearInterval(scanInterval);

    scanInterval = setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        if (faceMatcher && resizedDetections.length > 0) {
            resizedDetections.forEach(detection => {
                const result = faceMatcher.findBestMatch(detection.descriptor);
                const box = detection.detection.box;
                
                // Si la cara es desconocida dice "unknown", sino pone el nombre
                let colorBox = result.label === "unknown" ? '#ef4444' : '#10b981'; // Rojo si no sabe quién es, verde si lo conoce
                let texto = result.label === "unknown" ? 'Desconocido' : result.toString();

                const drawBox = new faceapi.draw.DrawBox(box, { 
                    label: texto,
                    boxColor: colorBox 
                });
                drawBox.draw(canvas);
            });
        }
    }, 100);
});

window.onload = cargarModelos;
