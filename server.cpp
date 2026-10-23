/**
 * @file server.cpp
 * @brief SUNOUF (صنوف) Platform - C++ Crow REST API Backend Server
 * 
 * Provides endpoints for Digital Menu Browsing, Order Placement, and Table Reservations:
 * - GET  /api/menu     : Retrieve full digital menu hierarchy with categories & items
 * - POST /api/order    : Process dine-in and takeaway orders
 * - POST /api/reserve  : Process table and VIP private dining reservations
 * - GET  /api/health   : Health-check endpoint
 * 
 * Runs on Port 8080 with CORS support.
 * @license Apache-2.0
 */

#include "crow.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <string>
#include <vector>
#include <chrono>
#include <random>
#include <sstream>
#include <iomanip>

using json = nlohmann::json;

// Helper to generate unique order and reservation references
std::string generate_reference_id(const std::string& prefix) {
    auto now = std::chrono::system_clock::now().time_since_epoch();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(now).count();
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(100, 999);
    
    std::stringstream ss;
    ss << prefix << "-" << (millis % 100000) << "-" << dis(gen);
    return ss.str();
}

// Add CORS headers to response
void add_cors_headers(crow::response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.set_header("Content-Type", "application/json; charset=utf-8");
}

int main() {
    crow::SimpleApp app;

    // Global OPTIONS handler for CORS preflight requests
    CROW_ROUTE(app, "/api/<path>")
    .methods("OPTIONS"_method)([](const crow::request&, const std::string&) {
        crow::response res(204);
        add_cors_headers(res);
        return res;
    });

    // -------------------------------------------------------------
    // Health Check Endpoint
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/health")
    .methods("GET"_method)([]() {
        crow::response res(200);
        add_cors_headers(res);
        json response = {
            {"status", "healthy"},
            {"service", "SUNOUF API (صنوف)"},
            {"version", "1.0.0"},
            {"port", 8080}
        };
        res.body = response.dump(2);
        return res;
    });

    // -------------------------------------------------------------
    // 1. Digital Menu Endpoint (GET /api/menu)
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/menu")
    .methods("GET"_method)([]() {
        crow::response res(200);
        add_cors_headers(res);

        json menu_data = {
            {"platform", "SUNOUF (صنوف)"},
            {"restaurant_name", "مطعم ومقهى نجد الفاخر"},
            {"currency", "SAR"},
            {"categories", {
                {
                    {"id", "signature"},
                    {"name_ar", "أطباق صنوف المميزة"},
                    {"name_en", "Sunouf Signatures"},
                    {"icon", "Sparkles"},
                    {"items", {
                        {
                            {"id", "sig-1"},
                            {"name_ar", "كتف لحم نعيمي بالعسل والزعفران"},
                            {"name_en", "Slow-Cooked Royal Lamb Shank"},
                            {"description_ar", "مطبوخ ببطء لمدة 8 ساعات مع أرز الزعفران الملكي والمكسرات المحمصة وزرشك."},
                            {"price", 185.00},
                            {"calories", 720},
                            {"is_popular", true},
                            {"allergens", {"مكسرات"}}
                        },
                        {
                            {"id", "sig-2"},
                            {"name_ar", "مندي الريش الملكية المدخنة"},
                            {"name_en", "Smoked Lamb Chops Mandi"},
                            {"description_ar", "ريش ضأن مدخنة بخشب الغضا الفاخر تقدم مع صوص الدقوس الطازج."},
                            {"price", 165.00},
                            {"calories", 650},
                            {"is_popular", true},
                            {"allergens", {}}
                        }
                    }}
                },
                {
                    {"id", "appetizers"},
                    {"name_ar", "المقبلات والشوربات"},
                    {"name_en", "Appetizers & Soups"},
                    {"icon", "Salad"},
                    {"items", {
                        {
                            {"id", "app-1"},
                            {"name_ar", "حمص بالكمأة السوداء والصنوبر"},
                            {"name_en", "Black Truffle Hummus"},
                            {"description_ar", "حمص كريمي ناعم مغطى بزيت الكمأة الإيطالية وصنوبر محمص وخبز تنور مقرمش."},
                            {"price", 48.00},
                            {"calories", 340},
                            {"is_popular", false},
                            {"allergens", {"سمسم", "مكسرات"}}
                        },
                        {
                            {"id", "app-2"},
                            {"name_ar", "سمبوسة الجبن العكاوي بالهيل"},
                            {"name_en", "Akkawi & Cardamom Sambusa"},
                            {"description_ar", "عجينة مقرمشة يدوية محشوة بمزيج الأجبان البلدية والنعناع الطازج."},
                            {"price", 38.00},
                            {"calories", 290},
                            {"is_popular", false},
                            {"allergens", {"مشتقات الحليب", "جلوتين"}}
                        }
                    }}
                },
                {
                    {"id", "desserts"},
                    {"name_ar", "الحلويات الشرقية الفاخرة"},
                    {"name_en", "Artisan Desserts"},
                    {"icon", "Cake"},
                    {"items", {
                        {
                            {"id", "des-1"},
                            {"name_ar", "كيكة الفستق والورد مع ورق الذهب"},
                            {"name_en", "Pistachio Rose Cake with Gold Leaf"},
                            {"description_ar", "طبقات إسفنجية خفيفة من الفستق الحلبي مع قشطة طازجة وقطرات ماء الورد الدمشقي."},
                            {"price", 55.00},
                            {"calories", 410},
                            {"is_popular", true},
                            {"allergens", {"مكسرات", "حليب", "بيض"}}
                        },
                        {
                            {"id", "des-2"},
                            {"name_ar", "كنافة نابلسية بالجبن والمستكة"},
                            {"name_en", "Authentic Cheese Kunafa"},
                            {"description_ar", "كنافة ذهبية مقرمشة تسقى بالقطر المعطر وتقدم ساخنة فور الطلب."},
                            {"price", 45.00},
                            {"calories", 480},
                            {"is_popular", false},
                            {"allergens", {"مشتقات الحليب", "جلوتين", "مكسرات"}}
                        }
                    }}
                },
                {
                    {"id", "beverages"},
                    {"name_ar", "المشروبات والقهوة المختصة"},
                    {"name_en", "Specialty Coffee & Drinks"},
                    {"icon", "Coffee"},
                    {"items", {
                        {
                            {"id", "bev-1"},
                            {"name_ar", "موكتايل صنوف بالزعفران والليمون"},
                            {"name_en", "Sunouf Saffron Mocktail"},
                            {"description_ar", "مزيج منعش من الليمون العضوي، ماء الزهر، ومنقوع الزعفران الإيراني الفاخر."},
                            {"price", 36.00},
                            {"calories", 120},
                            {"is_popular", true},
                            {"allergens", {}}
                        },
                        {
                            {"id", "bev-2"},
                            {"name_ar", "دلة القهوة السعودية الفاخرة (محصول خولاني)"},
                            {"name_en", "Premium Saudi Dallah Coffee"},
                            {"description_ar", "محمصة بدرجة شقراء خفيفة مع حب الهال والمسمار، تقدم مع سكري القصيم."},
                            {"price", 42.00},
                            {"calories", 15},
                            {"is_popular", true},
                            {"allergens", {}}
                        }
                    }}
                }
            }}
        };

        res.body = menu_data.dump(2);
        return res;
    });

    // -------------------------------------------------------------
    // 2. Order Placement Endpoint (POST /api/order)
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/order")
    .methods("POST"_method)([](const crow::request& req) {
        crow::response res;
        add_cors_headers(res);

        try {
            auto body_json = json::parse(req.body);

            // Validation
            if (!body_json.contains("items") || !body_json["items"].is_array() || body_json["items"].empty()) {
                res.code = 400;
                json err = {
                    {"success", false},
                    {"message_ar", "يجب تحديد صنف واحد على الأقل لإتمام الطلب."},
                    {"message_en", "At least one item is required in the order."}
                };
                res.body = err.dump(2);
                return res;
            }

            std::string order_id = generate_reference_id("ORD");
            double total_sar = body_json.value("total_sar", 0.0);
            std::string order_type = body_json.value("order_type", "dine_in");
            std::string table_number = body_json.value("table_number", "T-01");
            std::string customer_name = body_json.value("customer_name", "ضيف صنوف");
            std::string customer_phone = body_json.value("customer_phone", "");
            std::string payment_method = body_json.value("payment_method", "cash_or_pos");

            json success_response = {
                {"success", true},
                {"order_id", order_id},
                {"status", "received"},
                {"platform", "SUNOUF (صنوف)"},
                {"details", {
                    {"customer_name", customer_name},
                    {"customer_phone", customer_phone},
                    {"order_type", order_type},
                    {"table_number", table_number},
                    {"items_count", body_json["items"].size()},
                    {"total_sar", total_sar},
                    {"payment_method", payment_method},
                    {"estimated_prep_time_minutes", 20}
                }},
                {"message_ar", "تم استلام طلبكم بنجاح وجارٍ تحضيره في المطبخ الفاخر."},
                {"message_en", "Your order has been received and is being prepared."}
            };

            res.code = 201;
            res.body = success_response.dump(2);
            return res;

        } catch (const std::exception& e) {
            res.code = 400;
            json err = {
                {"success", false},
                {"error", e.what()},
                {"message_ar", "صيغة الطلب غير صالحة. يرجى إرسال حمولة JSON صحيحة."}
            };
            res.body = err.dump(2);
            return res;
        }
    });

    // -------------------------------------------------------------
    // 3. Table & Event Reservation Endpoint (POST /api/reserve)
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/reserve")
    .methods("POST"_method)([](const crow::request& req) {
        crow::response res;
        add_cors_headers(res);

        try {
            auto body_json = json::parse(req.body);

            // Validate guest name & phone & date
            if (!body_json.contains("guest_name") || !body_json.contains("guest_phone") || !body_json.contains("date")) {
                res.code = 400;
                json err = {
                    {"success", false},
                    {"message_ar", "الاسم ورقم الجوال وتاريخ الحجز حقول إلزامية."},
                    {"message_en", "Guest name, phone, and date are required fields."}
                };
                res.body = err.dump(2);
                return res;
            }

            std::string reservation_id = generate_reference_id("RSV");
            std::string guest_name = body_json["guest_name"];
            std::string guest_phone = body_json["guest_phone"];
            std::string date = body_json["date"];
            std::string time = body_json.value("time", "20:30");
            int guests_count = body_json.value("guests_count", 2);
            std::string occasion = body_json.value("occasion", "dinner");
            std::string seating_area = body_json.value("seating_area", "indoor_lounge");

            json success_response = {
                {"success", true},
                {"reservation_id", reservation_id},
                {"status", "confirmed"},
                {"platform", "SUNOUF (صنوف)"},
                {"reservation_details", {
                    {"guest_name", guest_name},
                    {"guest_phone", guest_phone},
                    {"date", date},
                    {"time", time},
                    {"guests_count", guests_count},
                    {"occasion", occasion},
                    {"seating_area", seating_area}
                }},
                {"message_ar", "تم تأكيد حجزكم بنجاح في صنوف. نتطلع لاستقبالكم وتوفير تجربة استثنائية."},
                {"message_en", "Your reservation has been confirmed. We look forward to hosting you."}
            };

            res.code = 201;
            res.body = success_response.dump(2);
            return res;

        } catch (const std::exception& e) {
            res.code = 400;
            json err = {
                {"success", false},
                {"error", e.what()},
                {"message_ar", "صيغة بيانات الحجز غير صالحة."}
            };
            res.body = err.dump(2);
            return res;
        }
    });

    std::cout << "========================================================\n";
    std::cout << "  خادم منصة صنوف (SUNOUF) يعمل الآن بنجاح على C++ Crow\n";
    std::cout << "  المنفذ: http://0.0.0.0:8080\n";
    std::cout << "  المسارات المتاحة:\n";
    std::cout << "   - GET  /api/health\n";
    std::cout << "   - GET  /api/menu\n";
    std::cout << "   - POST /api/order\n";
    std::cout << "   - POST /api/reserve\n";
    std::cout << "========================================================\n";

    app.port(8080).multithreaded().run();
    return 0;
}
