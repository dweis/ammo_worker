__report = {"info":{"file":"src/worker/mixins/rigid_body.js","fileShort":"worker/mixins/rigid_body.js","fileSafe":"worker_mixins_rigid_body_js","link":"files/worker_mixins_rigid_body_js/index.html"},"complexity":{"aggregate":{"line":1,"complexity":{"sloc":{"physical":324,"logical":204},"cyclomatic":26,"halstead":{"operators":{"distinct":23,"total":675,"identifiers":["__stripped__"]},"operands":{"distinct":142,"total":796,"identifiers":["__stripped__"]},"length":1471,"vocabulary":165,"difficulty":64.46478873239437,"volume":10835.859977155595,"effort":698531.424161143,"bugs":3.6119533257185314,"time":38807.301342285726},"params":25}},"functions":[{"name":"<anonymous>","line":2,"complexity":{"sloc":{"physical":323,"logical":23},"cyclomatic":1,"halstead":{"operators":{"distinct":9,"total":55,"identifiers":["__stripped__"]},"operands":{"distinct":29,"total":56,"identifiers":["__stripped__"]},"length":111,"vocabulary":38,"difficulty":8.689655172413794,"volume":582.519953992238,"effort":5061.897531242897,"bugs":0.19417331799741266,"time":281.21652951349427},"params":3}},{"name":"RigidBody_create","line":15,"complexity":{"sloc":{"physical":61,"logical":39},"cyclomatic":5,"halstead":{"operators":{"distinct":14,"total":103,"identifiers":["__stripped__"]},"operands":{"distinct":58,"total":133,"identifiers":["__stripped__"]},"length":236,"vocabulary":72,"difficulty":16.051724137931036,"volume":1456.1023003403857,"effort":23372.952441670674,"bugs":0.4853674334467952,"time":1298.497357870593},"params":2}},{"name":"RigidBody_setType","line":77,"complexity":{"sloc":{"physical":23,"logical":18},"cyclomatic":2,"halstead":{"operators":{"distinct":11,"total":45,"identifiers":["__stripped__"]},"operands":{"distinct":23,"total":48,"identifiers":["__stripped__"]},"length":93,"vocabulary":34,"difficulty":11.478260869565217,"volume":473.1340442362816,"effort":5430.75598601645,"bugs":0.15771134807876055,"time":301.7086658898028},"params":1}},{"name":"RigidBody_setWorldTransform","line":101,"complexity":{"sloc":{"physical":31,"logical":21},"cyclomatic":5,"halstead":{"operators":{"distinct":6,"total":71,"identifiers":["__stripped__"]},"operands":{"distinct":25,"total":80,"identifiers":["__stripped__"]},"length":151,"vocabulary":31,"difficulty":9.600000000000001,"volume":748.0836428684182,"effort":7181.602971536816,"bugs":0.24936121428947275,"time":398.97794286315644},"params":1}},{"name":"RigidBody_clearForces","line":133,"complexity":{"sloc":{"physical":8,"logical":4},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":13,"identifiers":["__stripped__"]},"operands":{"distinct":8,"total":14,"identifiers":["__stripped__"]},"length":27,"vocabulary":13,"difficulty":4.375,"volume":99.91187238980949,"effort":437.11444170541654,"bugs":0.03330395746326983,"time":24.284135650300918},"params":1}},{"name":"RigidBody_applyForce","line":142,"complexity":{"sloc":{"physical":15,"logical":10},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":45,"identifiers":["__stripped__"]},"operands":{"distinct":19,"total":54,"identifiers":["__stripped__"]},"length":99,"vocabulary":24,"difficulty":7.105263157894736,"volume":453.91128757139455,"effort":3225.1591485335925,"bugs":0.15130376252379818,"time":179.17550825186626},"params":1}},{"name":"RigidBody_applyCentralForce","line":158,"complexity":{"sloc":{"physical":12,"logical":7},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":29,"identifiers":["__stripped__"]},"operands":{"distinct":17,"total":34,"identifiers":["__stripped__"]},"length":63,"vocabulary":22,"difficulty":5,"volume":280.9441919741497,"effort":1404.7209598707486,"bugs":0.09364806399138323,"time":78.0400533261527},"params":1}},{"name":"RigidBody_applyImpulse","line":171,"complexity":{"sloc":{"physical":15,"logical":10},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":45,"identifiers":["__stripped__"]},"operands":{"distinct":19,"total":54,"identifiers":["__stripped__"]},"length":99,"vocabulary":24,"difficulty":7.105263157894736,"volume":453.91128757139455,"effort":3225.1591485335925,"bugs":0.15130376252379818,"time":179.17550825186626},"params":1}},{"name":"RigidBody_applyCentralImpulse","line":187,"complexity":{"sloc":{"physical":12,"logical":7},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":29,"identifiers":["__stripped__"]},"operands":{"distinct":17,"total":34,"identifiers":["__stripped__"]},"length":63,"vocabulary":22,"difficulty":5,"volume":280.9441919741497,"effort":1404.7209598707486,"bugs":0.09364806399138323,"time":78.0400533261527},"params":1}},{"name":"RigidBody_applyTorque","line":200,"complexity":{"sloc":{"physical":12,"logical":7},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":29,"identifiers":["__stripped__"]},"operands":{"distinct":17,"total":34,"identifiers":["__stripped__"]},"length":63,"vocabulary":22,"difficulty":5,"volume":280.9441919741497,"effort":1404.7209598707486,"bugs":0.09364806399138323,"time":78.0400533261527},"params":1}},{"name":"RigidBody_setRestitution","line":213,"complexity":{"sloc":{"physical":7,"logical":3},"cyclomatic":2,"halstead":{"operators":{"distinct":6,"total":12,"identifiers":["__stripped__"]},"operands":{"distinct":8,"total":14,"identifiers":["__stripped__"]},"length":26,"vocabulary":14,"difficulty":5.25,"volume":98.9912279734977,"effort":519.703946860863,"bugs":0.0329970759911659,"time":28.872441492270166},"params":1}},{"name":"RigidBody_setFriction","line":221,"complexity":{"sloc":{"physical":7,"logical":3},"cyclomatic":2,"halstead":{"operators":{"distinct":6,"total":12,"identifiers":["__stripped__"]},"operands":{"distinct":8,"total":14,"identifiers":["__stripped__"]},"length":26,"vocabulary":14,"difficulty":5.25,"volume":98.9912279734977,"effort":519.703946860863,"bugs":0.0329970759911659,"time":28.872441492270166},"params":1}},{"name":"RigidBody_setDamping","line":229,"complexity":{"sloc":{"physical":7,"logical":3},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":12,"identifiers":["__stripped__"]},"operands":{"distinct":9,"total":15,"identifiers":["__stripped__"]},"length":27,"vocabulary":14,"difficulty":4.166666666666667,"volume":102.7985828955553,"effort":428.32742873148044,"bugs":0.03426619429851843,"time":23.795968262860026},"params":1}},{"name":"RigidBody_getLinearVelocity","line":237,"complexity":{"sloc":{"physical":14,"logical":8},"cyclomatic":2,"halstead":{"operators":{"distinct":7,"total":22,"identifiers":["__stripped__"]},"operands":{"distinct":13,"total":25,"identifiers":["__stripped__"]},"length":47,"vocabulary":20,"difficulty":6.730769230769231,"volume":203.13062045970605,"effort":1367.2253300172522,"bugs":0.06771020681990202,"time":75.95696277873623},"params":2}},{"name":"RigidBody_setLinearFactor","line":252,"complexity":{"sloc":{"physical":10,"logical":6},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":26,"identifiers":["__stripped__"]},"operands":{"distinct":16,"total":31,"identifiers":["__stripped__"]},"length":57,"vocabulary":21,"difficulty":4.84375,"volume":250.36209309838935,"effort":1212.6913884453234,"bugs":0.08345403103279644,"time":67.37174380251797},"params":1}},{"name":"RigidBody_getAngularVelocity","line":263,"complexity":{"sloc":{"physical":14,"logical":8},"cyclomatic":2,"halstead":{"operators":{"distinct":7,"total":22,"identifiers":["__stripped__"]},"operands":{"distinct":13,"total":25,"identifiers":["__stripped__"]},"length":47,"vocabulary":20,"difficulty":6.730769230769231,"volume":203.13062045970605,"effort":1367.2253300172522,"bugs":0.06771020681990202,"time":75.95696277873623},"params":2}},{"name":"RigidBody_setAngularFactor","line":278,"complexity":{"sloc":{"physical":10,"logical":6},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":26,"identifiers":["__stripped__"]},"operands":{"distinct":16,"total":31,"identifiers":["__stripped__"]},"length":57,"vocabulary":21,"difficulty":4.84375,"volume":250.36209309838935,"effort":1212.6913884453234,"bugs":0.08345403103279644,"time":67.37174380251797},"params":1}},{"name":"RigidBody_setLinearVelocity","line":289,"complexity":{"sloc":{"physical":10,"logical":6},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":26,"identifiers":["__stripped__"]},"operands":{"distinct":16,"total":31,"identifiers":["__stripped__"]},"length":57,"vocabulary":21,"difficulty":4.84375,"volume":250.36209309838935,"effort":1212.6913884453234,"bugs":0.08345403103279644,"time":67.37174380251797},"params":1}},{"name":"RigidBody_setAngularVelocity","line":300,"complexity":{"sloc":{"physical":10,"logical":6},"cyclomatic":2,"halstead":{"operators":{"distinct":5,"total":26,"identifiers":["__stripped__"]},"operands":{"distinct":16,"total":31,"identifiers":["__stripped__"]},"length":57,"vocabulary":21,"difficulty":4.84375,"volume":250.36209309838935,"effort":1212.6913884453234,"bugs":0.08345403103279644,"time":67.37174380251797},"params":1}},{"name":"RigidBody_destroy","line":311,"complexity":{"sloc":{"physical":12,"logical":8},"cyclomatic":2,"halstead":{"operators":{"distinct":6,"total":24,"identifiers":["__stripped__"]},"operands":{"distinct":16,"total":32,"identifiers":["__stripped__"]},"length":56,"vocabulary":22,"difficulty":6,"volume":249.72817064368866,"effort":1498.369023862132,"bugs":0.08324272354789622,"time":83.24272354789622},"params":1}}],"maintainability":61.835140565941074,"params":1.25,"module":"worker/mixins/rigid_body.js"},"jshint":{"messages":[]}}