<?php
/**
 * DMC Medical Supplies - Native cPanel PHP API Bridge
 * Enables full Admin CRUD, file uploads, and JSON storage on standard PHP/Apache cPanel hosting.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$uploadsDir = __DIR__ . '/uploads/';
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

$productsFile = __DIR__ . '/products.json';
$newsFile = __DIR__ . '/news.json';
$careersFile = __DIR__ . '/careers.json';

// Helper to read JSON
function readJsonFile($filePath) {
    if (!file_exists($filePath)) return [];
    $content = file_get_contents($filePath);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

// Helper to write JSON
function writeJsonFile($filePath, $data) {
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Fallback to parse JSON body
$rawInput = file_get_contents('php_input');
$body = json_decode($rawInput, true) ?? [];
if (empty($action) && isset($body['action'])) {
    $action = $body['action'];
}

switch ($action) {
    // --- File Upload ---
    case 'upload':
    case 'UPLOAD_IMAGE':
        if (!empty($_FILES['file'])) {
            $file = $_FILES['file'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
            
            if (!in_array($ext, $allowed)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid file extension. Allowed: jpg, png, webp, gif']);
                exit();
            }

            $filename = 'img_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
            $targetPath = $uploadsDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                echo json_encode(['url' => 'uploads/' . $filename]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save uploaded image']);
            }
        } elseif (!empty($body['base64'])) {
            $base64Data = $body['base64'];
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $data = substr($base64Data, strpos($base64Data, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, etc.

                $data = base64_decode($data);
                if ($data === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Base64 decode failed']);
                    exit();
                }

                $filename = 'img_' . time() . '_' . rand(1000, 9999) . '.' . $type;
                file_put_contents($uploadsDir . $filename, $data);
                echo json_encode(['url' => 'uploads/' . $filename]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid base64 image data']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'No image file or base64 provided']);
        }
        break;

    // --- Products ---
    case 'get_products':
        echo json_encode(readJsonFile($productsFile));
        break;

    case 'save_products':
        if (isset($body['products'])) {
            writeJsonFile($productsFile, $body['products']);
            echo json_encode(['message' => 'Products saved successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing products payload']);
        }
        break;

    // --- News ---
    case 'get_news':
        echo json_encode(readJsonFile($newsFile));
        break;

    case 'save_news':
        if (isset($body['news'])) {
            writeJsonFile($newsFile, $body['news']);
            echo json_encode(['message' => 'News saved successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing news payload']);
        }
        break;

    // --- Careers ---
    case 'get_careers':
        echo json_encode(readJsonFile($careersFile));
        break;

    case 'save_careers':
        if (isset($body['careers'])) {
            writeJsonFile($careersFile, $body['careers']);
            echo json_encode(['message' => 'Careers saved successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing careers payload']);
        }
        break;

    // --- Stats ---
    case 'stats':
    case 'get_stats':
        $products = readJsonFile($productsFile);
        $news = readJsonFile($newsFile);
        $careers = readJsonFile($careersFile);

        $partners = array_values(array_unique(array_filter(array_column($products, 'partner'))));
        $divisions = array_values(array_unique(array_filter(array_column($products, 'division'))));

        echo json_encode([
            'totalProducts' => count($products),
            'totalNews' => count($news),
            'totalCareers' => count($careers),
            'totalPartners' => count($partners),
            'totalDivisions' => count($divisions)
        ]);
        break;

    default:
        echo json_encode([
            'status' => 'online',
            'system' => 'DMC Medical cPanel PHP Bridge API',
            'version' => '1.0'
        ]);
        break;
}
