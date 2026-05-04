const video = document.getElementById('video');
let faceMatcher = null;
let labeledDescriptors = [];

// Cargamos los modelos desde internet directamente
async function cargarModelos() {
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'; 
    
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        
        startVideo();
    } catch (error) {
        document.getElementById('status').innerText = "Error cargando modelos. Revisa tu conexión.";
        console.error(error);
    }
}

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => { 
            video.srcObject = stream;
            document.getElementById('status').innerText = "Cámara lista. Encuadra tu cara y llena los datos.";
        })
        .catch(err => {
            document.getElementById('status').innerText = "Error: Da permisos de cámara en tu navegador.";
            console.error(err);
        });
}

async function guardarPerfil() {
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const pais = document.getElementById('pais').value;

    if (!nombre || !apellido) return alert("Por favor completa tus datos");

    document.getElementById('status').innerText = "Escaneando... quedate quieto";
    
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    
    if (detection) {
        const info = `${nombre} ${apellido} | ${pais}`;
        labeledDescriptors = [new faceapi.LabeledFaceDescriptors(info, [detection.descriptor])];
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
        document.getElementById('status').innerText = "¡Perfil de " + nombre + " guardado con éxito!";
    } else {
        alert("No se detectó tu cara. Asegúrate de tener buena luz de frente.");
        document.getElementById('status').innerText = "Intenta de nuevo.";
    }
}

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
                
                const drawBox = new faceapi.draw.DrawBox(box, { 
                    label: result.toString(),
                    boxColor: '#3b82f6' 
                });
                drawBox.draw(canvas);
            });
        }
    }, 100);
});

// Iniciamos todo cuando cargue la página
window.onload = cargarModelos;
