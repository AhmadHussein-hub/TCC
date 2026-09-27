import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DetalhesMedicamentoScreen extends StatefulWidget {
  final Map<String, dynamic> medicamento;

  const DetalhesMedicamentoScreen({super.key, required this.medicamento});

  @override
  State<DetalhesMedicamentoScreen> createState() =>
      _DetalhesMedicamentoScreenState();
}

class _DetalhesMedicamentoScreenState extends State<DetalhesMedicamentoScreen> {
  final supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _historicoConsumo = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _carregarConsumoDoses();
  }

  
  Future<void> _carregarConsumoDoses() async {
    try {
      final response = await supabase
          .from('registro_consumo')
          .select()
          .eq('id_medicamento', widget.medicamento['id_medicamento']);

      if (mounted) {
        setState(() {
          _historicoConsumo = List<Map<String, dynamic>>.from(response);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  
  List<String> _gerarHorariosDoDia() {
    final horaInicioStr = widget.medicamento['hora_inicio'];
    final int frequenciaHoras = (widget.medicamento['frequencia_horas'] as num?)?.toInt() ?? 24;

    if (horaInicioStr == null) return [];

    List<String> horarios = [];
    try {
      
      final partes = horaInicioStr.toString().split(':');
      int horaAtual = int.parse(partes[0]);
      int minutoAtual = int.parse(partes[1]);

      
      while (horaAtual < 24) {
        String hFormatted = horaAtual.toString().padLeft(2, '0');
        String mFormatted = minutoAtual.toString().padLeft(2, '0');
        horarios.add('$hFormatted:$mFormatted');

        
        if (frequenciaHoras <= 0) break;
        
        horaAtual += frequenciaHoras;
      }
    } catch (e) {
      
      horarios.add(horaInicioStr.toString().substring(0, 5));
    }

    return horarios;
  }

  
  Future<void> _alternarStatusDose(String horario) async {
    try {
      final idMed = widget.medicamento['id_medicamento'];
      final idPac = widget.medicamento['id_paciente'];

      
      final jaExiste = _historicoConsumo.any(
        (reg) =>
            reg['horario_registro'] != null &&
            reg['horario_registro'].toString().contains(horario),
      );

      if (jaExiste) {
        
        await supabase
            .from('registro_consumo')
            .delete()
            .eq('id_medicamento', idMed)
            .ilike('horario_registro', '%$horario%');
      } else {
        
        await supabase.from('registro_consumo').insert({
          'id_medicamento': idMed,
          'id_paciente': idPac,
          'status': 'TOMADO',
          'horario_registro':
              '${DateTime.now().toIso8601String().substring(0, 10)}T$horario:00',
        });
      }

      await _carregarConsumoDoses();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao atualizar dose: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final nome = widget.medicamento['nome_farmaco'] ?? 'Medicamento';
    final dosagem = widget.medicamento['dosagem'] ?? '';
    final frequencia = widget.medicamento['frequencia_horas'] ?? 24;
    final limiteAtraso = widget.medicamento['limite_atraso_minutos'] ?? 30;

    final listaHorarios = _gerarHorariosDoDia();

    return Scaffold(
      appBar: AppBar(
        title: Text(nome),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF93C5FD)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$nome ($dosagem)',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '• Frequência: De $frequencia em $frequencia horas',
                          style: const TextStyle(color: Color(0xFF1E40AF)),
                        ),
                        Text(
                          '• Limite de tolerância/atraso: $limiteAtraso minutos',
                          style: const TextStyle(color: Color(0xFF1E40AF)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'HORÁRIOS AGENDADOS PARA HOJE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF64748B),
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 12),

                  
                  Expanded(
                    child: listaHorarios.isEmpty
                        ? const Center(
                            child: Text(
                              'Nenhum horário inicial definido para calcular a rotina.',
                            ),
                          )
                        : ListView.builder(
                            itemCount: listaHorarios.length,
                            itemBuilder: (context, index) {
                              final horario = listaHorarios[index];

                              
                              final registroEncontrado = _historicoConsumo
                                  .firstWhere(
                                    (reg) =>
                                        reg['horario_registro'] != null &&
                                        reg['horario_registro']
                                            .toString()
                                            .contains(horario),
                                    orElse: () => <String, dynamic>{},
                                  );

                              final bool foiTomado =
                                  registroEncontrado.isNotEmpty;

                              return Card(
                                elevation: 0,
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(
                                    color: foiTomado
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                color: foiTomado
                                    ? const Color(0xFFECFDF5)
                                    : Colors.white,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 4.0,
                                  ),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: foiTomado
                                            ? const Color(0xFF10B981)
                                            : const Color(0xFFFEF3C7),
                                        child: Icon(
                                          foiTomado
                                              ? Icons.check
                                              : Icons.access_time,
                                          color: foiTomado
                                              ? Colors.white
                                              : const Color(0xFFD97706),
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              'Horário: $horario',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: foiTomado
                                                    ? const Color(0xFF065F46)
                                                    : const Color(0xFF0F172A),
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              foiTomado
                                                  ? 'Confirmado como Tomado'
                                                  : 'Aguardando / Pendente',
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: foiTomado
                                                    ? const Color(0xFF059669)
                                                    : const Color(0xFFD97706),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      SizedBox(
                                        width: 110,
                                        child: ElevatedButton.icon(
                                          onPressed: () {
                                            _alternarStatusDose(horario);
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: foiTomado
                                                ? Colors.red[50]
                                                : const Color(0xFF2563EB),
                                            foregroundColor: foiTomado
                                                ? Colors.red
                                                : Colors.white,
                                            elevation: 0,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                          ),
                                          icon: Icon(
                                            foiTomado ? Icons.close : Icons.check,
                                            size: 16,
                                          ),
                                          label: Text(
                                            foiTomado ? 'Desfazer' : 'Confirmar',
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}
