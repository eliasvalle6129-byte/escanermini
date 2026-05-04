const video = document.getElementById('video');
let faceMatcher = null;
let labeledDescriptors = [];

// Cargar modelos desde tu carpeta local /models
async function cargarModelos() {
    const MODEL_URL = '/models'; // Ruta relativa en tu repo de GitHub
    
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        
        startVideo();
    } catch (error) {
        document.getElementById('status').innerText = "Error cargando modelos de la carpeta /models";
        console.error(error);
    }
}

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => { 
            video.srcObject = stream;
            document.getElementById('status').innerText = "Sistema Listo. Encuadra tu cara.";
        })
        .catch(err => {
            document.getElementById('status').innerText = "Error: No se pudo acceder a la cámara.";
        });
}

async function guardarPerfil() {
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const pais = document.getElementById('pais').value;

    if (!nombre || !apellido) return alert("Por favor completa tus datos");

    document.getElementById('status').innerText = "Escaneando... no te muevas";
    
    // Detectar rostro con alta precisión
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    
    if (detection) {
        const info = `${nombre} ${apellido} | ${pais}`;
        labeledDescriptors = [new faceapi.LabeledFaceDescriptors(info, [detection.descriptor])];
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
        document.getElementById('status').innerText = "¡Perfil de " + nombre + " guardado!";
    } else {
        alert("No se detectó tu cara. Asegúrate de tener buena luz.");
        document.getElementById('status').innerText = "Reintentando...";
    }
}

// Escaneo en vivo una vez que el video empieza a reproducirse
video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.getElementById('container').append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        if (faceMatcher && resizedDetections.length > 0) {
            resizedDetections.forEach(detection => {
                const result = faceMatcher.findBestMatch(detection.descriptor);
                const box = detection.detection.box;
                
                // Dibujar el cuadro y el nombre arriba
                const drawBox = new faceapi.draw.DrawBox(box, { 
                    label: result.toString(),
                    boxColor: '#3b82f6' 
                });
                drawBox.draw(canvas);
            });
        }
    }, 100);
});

cargarModelos();
