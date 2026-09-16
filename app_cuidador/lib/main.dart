import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'login_screen.dart'; // Vamos criar este arquivo no próximo passo
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Carrega variáveis do arquivo .env
  await dotenv.load(fileName: ".env");

  // Liga o Firebase
  await Firebase.initializeApp();

  // Inicialização do Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  runApp(const MeuTccApp());
}

class MeuTccApp extends StatelessWidget {
  const MeuTccApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'App do Cuidador - TCC',
      debugShowCheckedModeBanner: false, // Tira a faixa de "Debug" da tela
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}