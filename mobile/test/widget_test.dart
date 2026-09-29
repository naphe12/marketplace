import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markatos_mobile/main.dart';

void main() {
  testWidgets('Markatos app boots', (tester) async {
    await tester.pumpWidget(const MarkatosApp());

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
