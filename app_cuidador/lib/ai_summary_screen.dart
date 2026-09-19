import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AiSummaryScreen extends StatefulWidget {
  final int pacienteId;

  const AiSummaryScreen({super.key, required this.pacienteId});

  @override
  State<AiSummaryScreen> createState() => _AiSummaryScreenState();
}

class _AiSummaryScreenState extends State<AiSummaryScreen> {
  String _resumo = "";
  bool _isLoading = true;
  String _errorMessage = "";

  @override
  void initState() {
    super.initState();
    _buscarResumoIA();
  }

  Future<void> _buscarResumoIA() async {
    setState(() {
      _isLoading = true;
      _errorMessage = "";
    });

    try {
      // Pega a URL do backend do arquivo .env, ou usa o localhost do emulador Android como fallback
      final baseUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:3000';
      final url = Uri.parse('$baseUrl/api/ai/resumo/${widget.pacienteId}');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _resumo = data['resumo'];
        });
      } else {
        setState(() {
          _errorMessage = "Erro ao buscar resumo (Status: ${response.statusCode}). Verifique se a API Key do Gemini está configurada no backend.";
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Erro de conexão: $e";
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resumo Inteligente (IA)'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: _isLoading
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('A Inteligência Artificial está analisando os dados...'),
                  ],
                ),
              )
            : _errorMessage.isNotEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 48),
                        const SizedBox(height: 16),
                        Text(_errorMessage, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _buscarResumoIA,
                          child: const Text('Tentar Novamente'),
                        )
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.auto_awesome, color: Colors.indigo, size: 48),
                        const SizedBox(height: 16),
                        const Text(
                          'Análise da Semana',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.indigo),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.indigo.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.indigo.shade100),
                          ),
                          child: Text(
                            _resumo,
                            style: const TextStyle(fontSize: 16, height: 1.5),
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }
}
